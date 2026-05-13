import { NextResponse } from 'next/server';

import { setOrganizationStripeCustomerId } from '../../../../lib/billing-server';
import { requireOrganizationAdminAccess } from '../../../../lib/server-auth';
import {
  createStripeCheckoutSession,
  createStripeCustomer,
} from '../../../../lib/stripe-server';

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

    const { user, membership } = await requireOrganizationAdminAccess(request, organizationId);
    let customerId = membership.organization.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await createStripeCustomer({
        email: user.email?.trim() ?? '',
        organizationId,
        organizationName: membership.organization.name,
      });

      customerId = customer.id;

      await setOrganizationStripeCustomerId({
        customerId,
        organizationId,
      });
    }

    const session = await createStripeCheckoutSession({
      customerId,
      organizationId,
      organizationName: membership.organization.name,
    });

    if (!session.url) {
      throw new Error('Unable to create a Stripe Checkout session.');
    }

    return NextResponse.json({
      ok: true,
      url: session.url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to start checkout.',
      },
      { status: 500 },
    );
  }
}
