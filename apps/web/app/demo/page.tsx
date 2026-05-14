import type { Metadata } from 'next';
import Link from 'next/link';

import {
  FeatureGrid,
  MarketingPageShell,
  SampleCardSection,
  Section,
  WorkflowSteps,
} from '../../lib/marketing-site';

export const metadata: Metadata = {
  title: 'Repple Demo',
  description: 'See the Repple dealership workflow, card output, and CRM handoff process.',
};

export default function DemoPage() {
  return (
    <MarketingPageShell currentPath="/demo">
      <Section
        eyebrow="Demo"
        title="See the exact dealership workflow Repple is built around."
        description="The demo stays focused on the current product: extract CRM data, generate the card, copy the message, and keep the dealership’s CRM texting process in place."
      >
        <div
          style={{
            borderRadius: 28,
            background: 'rgba(255,255,255,0.82)',
            border: '1px solid rgba(16,32,56,0.08)',
            boxShadow: '0 24px 56px rgba(16,32,56,0.08)',
            padding: 24,
            display: 'grid',
            gap: 16,
          }}
        >
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#102038' }}>
            A live walkthrough should answer three questions.
          </p>
          <FeatureGrid
            items={[
              {
                title: 'How fast is the rep flow?',
                body: 'Open the CRM page, auto-fill the side panel, make edits, generate the card, and copy the message in one pass.',
              },
              {
                title: 'What does the customer see?',
                body: 'A premium appointment card with dealership identity, vehicle details, appointment timing, and clear confirm or reschedule actions.',
              },
              {
                title: 'What changes in the CRM workflow?',
                body: 'Only the quality of the handoff. Reps still paste the final message into the dealership’s current CRM texting system.',
              },
            ]}
          />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/install"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 48,
                padding: '12px 18px',
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 800,
                background: '#102038',
                color: '#ffffff',
                boxShadow: '0 16px 32px rgba(16,32,56,0.14)',
              }}
            >
              Install Extension
            </Link>
            <Link
              href="/pricing"
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
                border: '1px solid rgba(16,32,56,0.1)',
              }}
            >
              View Pricing
            </Link>
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
                border: '1px solid rgba(16,32,56,0.1)',
              }}
            >
              Open App
            </Link>
          </div>
        </div>
      </Section>

      <Section
        eyebrow="Workflow"
        title="What the demo covers"
        description="The walkthrough should mirror the actual Repple product, not a separate sales-only path."
      >
        <WorkflowSteps
          steps={[
            {
              title: 'CRM extraction',
              body: 'Show how Repple reads customer, vehicle, appointment, dealership, VIN, and image details from the visible CRM page.',
            },
            {
              title: 'Side-panel editing',
              body: 'Review the editable form, the live preview, and the generated message without leaving the CRM context.',
            },
            {
              title: 'Customer card',
              body: 'Open the public appointment card and show the confirm and reschedule states from the customer point of view.',
            },
            {
              title: 'Dealership activity',
              body: 'Show recent card activity and simple counts so the store can see whether Repple is actually being used.',
            },
          ]}
        />
      </Section>

      <Section
        eyebrow="Customer view"
        title="The card shown in the demo is the real product card."
        description="Repple reuses one card system across the extension preview, the public page, and the marketing sample."
      >
        <SampleCardSection />
      </Section>
    </MarketingPageShell>
  );
}
