import type { Metadata } from 'next';
import Link from 'next/link';

import {
  FeatureGrid,
  MarketingPageShell,
  PricingTierGrid,
  Section,
} from '../../lib/marketing-site';

export const metadata: Metadata = {
  title: 'Repple Pricing',
  description: 'Simple rooftop pricing for dealership teams using Repple appointment cards.',
};

export default function PricingPage() {
  return (
    <MarketingPageShell currentPath="/pricing">
      <Section
        eyebrow="Pricing"
        title="Simple rooftop pricing for dealership teams."
        description="Repple now presents three public tiers so a dealership can understand the rollout level before opening the app to activate billing."
      >
        <PricingTierGrid />

        <div style={{ height: 18 }} />

        <div
          style={{
            borderRadius: 24,
            background: '#102038',
            color: '#ffffff',
            padding: 22,
            display: 'grid',
            gap: 12,
          }}
        >
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
            Billing happens inside the Repple app.
          </p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.82)' }}>
            Dealership owners and admins sign in, create the dealership account, and start billing
            from the existing in-app Stripe flow. Repple still does not send SMS or replace the CRM.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/app"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 48,
                padding: '12px 18px',
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 800,
                background: '#ffffff',
                color: '#102038',
              }}
            >
              Open App to Start Billing
            </Link>
            <Link
              href="/demo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 48,
                padding: '12px 18px',
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 800,
                background: 'transparent',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              Request Demo
            </Link>
          </div>
        </div>
      </Section>

      <Section
        eyebrow="What is included"
        title="Focused product scope, not a bundled CRM rebuild."
        description="Pricing stays aligned with the current Repple product boundary."
      >
        <FeatureGrid
          items={[
            {
              title: 'Included',
              body: 'Appointment card generation, public card links, dealership branding, side-panel rep workflow, customer confirmation, reschedule requests, and dealership activity visibility.',
            },
            {
              title: 'Not included',
              body: 'Twilio, SMS delivery, inbox management, enterprise SSO, complex permissions, giant dashboards, or CRM replacement workflows.',
            },
            {
              title: 'Best fit',
              body: 'Dealership teams that already text from the CRM and want a better pre-visit customer experience without changing that habit.',
            },
            {
              title: 'Expansion path',
              body: 'Usage limits, billing depth, and more advanced controls can grow later without changing the core dealership workflow.',
            },
          ]}
        />
      </Section>
    </MarketingPageShell>
  );
}
