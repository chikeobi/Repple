import type { OrganizationSubscriptionStatus } from '../../../shared/billing';
import type { OrganizationRow } from '../../../shared/supabase-schema';
import { getSupabaseAdminClient } from './supabase-admin';

type BillingStateInput = {
  customerId?: string | null;
  organizationId?: string | null;
  subscriptionCurrentPeriodEndsAt?: string | null;
  subscriptionId?: string | null;
  subscriptionStatus?: string | null;
};

type BillingIdentityInput = Pick<
  BillingStateInput,
  'customerId' | 'organizationId' | 'subscriptionId'
>;

function normalizeSubscriptionStatus(
  status: string | null | undefined,
): OrganizationSubscriptionStatus {
  switch (status) {
    case 'trialing':
    case 'active':
    case 'past_due':
    case 'canceled':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return status;
    default:
      return 'inactive';
  }
}

async function resolveOrganizationId(input: BillingIdentityInput) {
  const normalizedOrganizationId = input.organizationId?.trim() ?? '';

  if (normalizedOrganizationId) {
    return normalizedOrganizationId;
  }

  const adminClient = getSupabaseAdminClient();
  const normalizedSubscriptionId = input.subscriptionId?.trim() ?? '';
  const normalizedCustomerId = input.customerId?.trim() ?? '';

  if (normalizedSubscriptionId) {
    const { data, error } = await adminClient
      .from('organizations')
      .select('id')
      .eq('stripe_subscription_id', normalizedSubscriptionId)
      .maybeSingle();
    const organization = data as { id: string } | null;

    if (error) {
      throw new Error(error.message);
    }

    if (organization?.id) {
      return organization.id;
    }
  }

  if (normalizedCustomerId) {
    const { data, error } = await adminClient
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', normalizedCustomerId)
      .maybeSingle();
    const organization = data as { id: string } | null;

    if (error) {
      throw new Error(error.message);
    }

    if (organization?.id) {
      return organization.id;
    }
  }

  return null;
}

export async function updateOrganizationBillingState(input: BillingStateInput) {
  const organizationId = await resolveOrganizationId(input);

  if (!organizationId) {
    return null;
  }

  const adminClient = getSupabaseAdminClient();
  const organizationsTable = adminClient.from('organizations') as any;
  const { data, error } = await organizationsTable
    .from('organizations')
    .update({
      stripe_customer_id: input.customerId?.trim() || null,
      stripe_subscription_id: input.subscriptionId?.trim() || null,
      subscription_status: normalizeSubscriptionStatus(input.subscriptionStatus),
      subscription_current_period_ends_at: input.subscriptionCurrentPeriodEndsAt ?? null,
    })
    .eq('id', organizationId)
    .select(
      'id, name, slug, website_url, logo_url, address, phone, brand_color, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_ends_at, created_at',
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as OrganizationRow;
}

export async function setOrganizationStripeCustomerId(input: {
  customerId: string;
  organizationId: string;
}) {
  const adminClient = getSupabaseAdminClient();
  const organizationsTable = adminClient.from('organizations') as any;
  const { error } = await organizationsTable
    .update({
      stripe_customer_id: input.customerId.trim(),
    })
    .eq('id', input.organizationId.trim());

  if (error) {
    throw new Error(error.message);
  }
}
