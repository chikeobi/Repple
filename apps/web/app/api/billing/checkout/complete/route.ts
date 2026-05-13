import { NextResponse } from 'next/server';

import { updateOrganizationBillingState } from '../../../../../lib/billing-server';
import { requireOrganizationAdminAccess } from '../../../../../lib/server-auth';
import {
  normalizeStripeCustomerId,
  normalizeStripeSubscription,
  retrieveStripeCheckoutSession,
} from '../../../../../lib/stripe-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      organizationId?: string;
      sessionId?: string;
    };
    const organizationId = payload.organizationId?.trim() ?? '';
    const sessionId = payload.sessionId?.trim() ?? '';

    if (!organizationId || !sessionId) {
      return NextResponse.json(
        { error: 'Organization ID and session ID are required.' },
        { status: 400 },
      );
    }

    await requireOrganizationAdminAccess(request, organizationId);
    const session = await retrieveStripeCheckoutSession(sessionId);
    const subscription = normalizeStripeSubscription(session.subscription);
    const customerId = normalizeStripeCustomerId(session.customer);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Stripe did not return a subscription for this checkout session.' },
        { status: 400 },
      );
    }

    await updateOrganizationBillingState({
      customerId,
      organizationId,
      subscriptionCurrentPeriodEndsAt: subscription.currentPeriodEndsAt,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status ?? 'inactive',
    });

    return NextResponse.json({
      ok: true,
      subscriptionStatus: subscription.status ?? 'inactive',
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to finalize the Stripe subscription.',
      },
      { status: 500 },
    );
  }
}
