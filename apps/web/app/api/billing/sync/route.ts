import { NextResponse } from 'next/server';

import { updateOrganizationBillingState } from '../../../../lib/billing-server';
import { requireOrganizationAdminAccess } from '../../../../lib/server-auth';
import { retrieveStripeSubscription } from '../../../../lib/stripe-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      organizationId?: string;
    };
    const organizationId = payload.organizationId?.trim() ?? '';

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required.' }, { status: 400 });
    }

    const { membership } = await requireOrganizationAdminAccess(request, organizationId);
    const subscriptionId = membership.organization.stripe_subscription_id?.trim() ?? '';

    if (!subscriptionId) {
      return NextResponse.json({
        ok: true,
        subscriptionStatus: membership.organization.subscription_status ?? 'inactive',
      });
    }

    const subscription = await retrieveStripeSubscription(subscriptionId);

    await updateOrganizationBillingState({
      customerId: subscription.customer,
      organizationId,
      subscriptionCurrentPeriodEndsAt:
        typeof subscription.current_period_end === 'number'
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
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
          error instanceof Error ? error.message : 'Unable to sync Stripe billing status.',
      },
      { status: 500 },
    );
  }
}
