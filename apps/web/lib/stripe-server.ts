import crypto from 'node:crypto';

import { getSiteUrl } from './env';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STRIPE_API_VERSION = '2026-02-25.clover';

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getStripeBillingConfig() {
  return {
    secretKey: getRequiredEnv('STRIPE_SECRET_KEY'),
    siteUrl: getSiteUrl(),
  };
}

function getStripePriceId() {
  return getRequiredEnv('STRIPE_PRICE_ID');
}

function getStripeWebhookSecret() {
  return getRequiredEnv('STRIPE_WEBHOOK_SECRET');
}

async function stripeRequest<T>(
  path: string,
  init: {
    method?: 'GET' | 'POST';
    body?: URLSearchParams;
  } = {},
) {
  const { secretKey } = getStripeBillingConfig();

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: init.method ?? 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Stripe-Version': STRIPE_API_VERSION,
      ...(init.body
        ? {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        : {}),
    },
    body: init.body?.toString(),
    cache: 'no-store',
  });

  const payload = (await response.json()) as T & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Stripe request failed.');
  }

  return payload;
}

type StripeCustomer = {
  id: string;
};

type StripeCheckoutSession = {
  id: string;
  url: string | null;
  status: string | null;
  customer: string | StripeCustomer | null;
  subscription:
    | null
    | string
    | {
        id: string;
        status: string | null;
        current_period_end: number | null;
      };
};

type StripePortalSession = {
  url: string;
};

type StripeWebhookEvent<T = Record<string, unknown>> = {
  data: {
    object: T;
  };
  id: string;
  type: string;
};

type StripeSubscription = {
  id: string;
  customer: string | null;
  current_period_end: number | null;
  metadata?: {
    organization_id?: string;
  } | null;
  status: string | null;
};

type StripeWebhookCheckoutSession = {
  customer: string | StripeCustomer | null;
  metadata?: {
    organization_id?: string;
  } | null;
  subscription:
    | string
    | {
        id: string;
      }
    | null;
};

export async function createStripeCustomer(input: {
  email: string;
  organizationId: string;
  organizationName: string;
}) {
  const body = new URLSearchParams();
  body.set('email', input.email);
  body.set('name', input.organizationName);
  body.set('metadata[organization_id]', input.organizationId);

  return stripeRequest<StripeCustomer>('/customers', { body });
}

export async function createStripeCheckoutSession(input: {
  customerId: string;
  organizationId: string;
  organizationName: string;
}) {
  const { siteUrl } = getStripeBillingConfig();
  const priceId = getStripePriceId();
  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('customer', input.customerId);
  body.set('line_items[0][price]', priceId);
  body.set('line_items[0][quantity]', '1');
  body.set('success_url', `${siteUrl}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  body.set('cancel_url', `${siteUrl}/app?checkout=canceled`);
  body.set('client_reference_id', input.organizationId);
  body.set('metadata[organization_id]', input.organizationId);
  body.set('metadata[organization_name]', input.organizationName);
  body.set('subscription_data[metadata][organization_id]', input.organizationId);

  return stripeRequest<StripeCheckoutSession>('/checkout/sessions', { body });
}

export async function createStripePortalSession(input: {
  customerId: string;
}) {
  const { siteUrl } = getStripeBillingConfig();
  const body = new URLSearchParams();
  body.set('customer', input.customerId);
  body.set('return_url', `${siteUrl}/app`);

  return stripeRequest<StripePortalSession>('/billing_portal/sessions', { body });
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  const query = new URLSearchParams();
  query.append('expand[]', 'subscription');
  query.append('expand[]', 'customer');

  return stripeRequest<StripeCheckoutSession>(
    `/checkout/sessions/${encodeURIComponent(sessionId)}?${query.toString()}`,
    {
      method: 'GET',
    },
  );
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  return stripeRequest<StripeSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'GET',
  });
}

function parseStripeSignatureHeader(value: string) {
  const pairs = value
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const separatorIndex = segment.indexOf('=');

      if (separatorIndex === -1) {
        return null;
      }

      return {
        key: segment.slice(0, separatorIndex),
        value: segment.slice(separatorIndex + 1),
      };
    })
    .filter((entry): entry is { key: string; value: string } => Boolean(entry));

  return {
    timestamp: pairs.find((entry) => entry.key === 't')?.value ?? '',
    signatures: pairs.filter((entry) => entry.key === 'v1').map((entry) => entry.value),
  };
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string) {
  const webhookSecret = getStripeWebhookSecret();
  const { signatures, timestamp } = parseStripeSignatureHeader(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    throw new Error('Missing Stripe webhook signature.');
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  const matched = signatures.some((signature) => {
    try {
      const actualBuffer = Buffer.from(signature, 'hex');

      return (
        actualBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(actualBuffer, expectedBuffer)
      );
    } catch {
      return false;
    }
  });

  if (!matched) {
    throw new Error('Invalid Stripe webhook signature.');
  }
}

export function parseStripeWebhookEvent(payload: string) {
  return JSON.parse(payload) as StripeWebhookEvent;
}

export function normalizeStripeSubscription(input: StripeCheckoutSession['subscription']) {
  if (!input || typeof input === 'string') {
    return null;
  }

  return {
    id: input.id,
    status: input.status,
    currentPeriodEndsAt:
      typeof input.current_period_end === 'number'
        ? new Date(input.current_period_end * 1000).toISOString()
        : null,
  };
}

export function normalizeStripeCustomerId(input: StripeCheckoutSession['customer']) {
  if (!input) {
    return null;
  }

  return typeof input === 'string' ? input : input.id;
}

export function normalizeStripeSubscriptionState(input: {
  current_period_end: number | null;
  id: string | null;
  status: string | null;
}) {
  return {
    customerId: null,
    subscriptionCurrentPeriodEndsAt:
      typeof input.current_period_end === 'number'
        ? new Date(input.current_period_end * 1000).toISOString()
        : null,
    subscriptionId: input.id,
    subscriptionStatus: input.status ?? 'inactive',
  };
}

export function getOrganizationIdFromStripeMetadata(input: {
  metadata?: {
    organization_id?: string;
  } | null;
}) {
  return input.metadata?.organization_id?.trim() ?? null;
}

export function extractStripeCheckoutBillingIdentity(input: StripeWebhookCheckoutSession) {
  return {
    customerId: normalizeStripeCustomerId(input.customer),
    organizationId: getOrganizationIdFromStripeMetadata(input),
    subscriptionId:
      typeof input.subscription === 'string'
        ? input.subscription.trim()
        : input.subscription?.id?.trim() ?? null,
  };
}
