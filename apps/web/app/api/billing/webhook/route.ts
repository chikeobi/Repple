import { NextResponse } from 'next/server';

import { updateOrganizationBillingState } from '../../../../lib/billing-server';
import {
  extractStripeCheckoutBillingIdentity,
  getOrganizationIdFromStripeMetadata,
  normalizeStripeSubscriptionState,
  parseStripeWebhookEvent,
  retrieveStripeCheckoutSession,
  verifyStripeWebhookSignature,
} from '../../../../lib/stripe-server';

export const dynamic = 'force-dynamic';

type StripeSubscriptionEventObject = {
  current_period_end: number | null;
  customer: string | null;
  id: string;
  metadata?: {
    organization_id?: string;
  } | null;
  status: string | null;
};

export async function POST(request: Request) {
  const payload = await request.text();
  const signatureHeader = request.headers.get('stripe-signature')?.trim() ?? '';

  try {
    verifyStripeWebhookSignature(payload, signatureHeader);

    const event = parseStripeWebhookEvent(payload);

    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = await retrieveStripeCheckoutSession(
          String((event.data.object as { id: string }).id),
        );
        const identity = extractStripeCheckoutBillingIdentity(checkoutSession);
        const subscription =
          typeof checkoutSession.subscription === 'string' || !checkoutSession.subscription
            ? null
            : checkoutSession.subscription;

        if (subscription) {
          await updateOrganizationBillingState({
            customerId: identity.customerId,
            organizationId: identity.organizationId,
            subscriptionCurrentPeriodEndsAt:
              typeof subscription.current_period_end === 'number'
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status ?? 'inactive',
          });
        } else if (identity.organizationId && identity.customerId) {
          await updateOrganizationBillingState({
            customerId: identity.customerId,
            organizationId: identity.organizationId,
          });
        }

        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as StripeSubscriptionEventObject;
        const normalized = normalizeStripeSubscriptionState(subscription);

        await updateOrganizationBillingState({
          customerId: subscription.customer,
          organizationId: getOrganizationIdFromStripeMetadata(subscription),
          subscriptionCurrentPeriodEndsAt: normalized.subscriptionCurrentPeriodEndsAt,
          subscriptionId: normalized.subscriptionId,
          subscriptionStatus: normalized.subscriptionStatus,
        });
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Invalid Stripe webhook request.',
        received: false,
      },
      { status: 400 },
    );
  }
}
