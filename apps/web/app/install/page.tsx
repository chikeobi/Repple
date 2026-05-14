import type { Metadata } from 'next';

import {
  MarketingPageShell,
  PolicyCard,
  Section,
  WorkflowSteps,
} from '../../lib/marketing-site';

export const metadata: Metadata = {
  title: 'Install Repple Extension',
  description:
    'Install instructions, screenshots, and permission details for the Repple Chrome extension.',
};

const STORE_SCREENSHOTS = [
  {
    src: '/store/repple-store-01-sidepanel.svg',
    alt: 'Repple sidepanel screenshot showing CRM extraction and live preview.',
    title: 'Generate from the CRM page',
    body: 'Reps open Repple in the side panel, review the auto-filled fields, and generate a customer-ready appointment card.',
  },
  {
    src: '/store/repple-store-02-customer-card.svg',
    alt: 'Repple customer card screenshot showing premium branded appointment presentation.',
    title: 'Customer-facing appointment card',
    body: 'The public card stays compact, branded, and mobile-first without pretending a fake AI video exists.',
  },
  {
    src: '/store/repple-store-03-activity.svg',
    alt: 'Repple activity screenshot showing viewed, confirmed, and reschedule requested status.',
    title: 'Status the rep can trust',
    body: 'Reps can see when a card was viewed, confirmed, or rescheduled without leaving the Repple workflow.',
  },
] as const;

export default function InstallPage() {
  return (
    <MarketingPageShell currentPath="/install">
      <Section
        eyebrow="Install"
        title="Manual install instructions for the Repple extension."
        description="Use these steps for local or pilot testing before Chrome Web Store submission."
      >
        <WorkflowSteps
          steps={[
            {
              title: 'Build the extension',
              body: 'From the repo root, run npm run build. This creates the Chrome extension bundle in .output/chrome-mv3.',
            },
            {
              title: 'Open Chrome extension management',
              body: 'In Chrome, open chrome://extensions and enable Developer mode in the top-right corner.',
            },
            {
              title: 'Load the unpacked build',
              body: 'Click Load unpacked and select the .output/chrome-mv3 folder from this repo.',
            },
            {
              title: 'Pin and use Repple',
              body: 'Pin Repple to the Chrome toolbar, open a CRM page, click the extension icon, and work from the side panel.',
            },
          ]}
        />
      </Section>

      <Section
        eyebrow="Screenshots"
        title="Store-ready visuals for manual installs and listing prep."
        description="These are the current Chrome-store-style visuals for the live product workflow."
      >
        <div
          style={{
            display: 'grid',
            gap: 18,
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {STORE_SCREENSHOTS.map((shot) => (
            <div
              key={shot.src}
              style={{
                background: 'rgba(255,255,255,0.84)',
                border: '1px solid rgba(16,32,56,0.08)',
                borderRadius: 24,
                padding: 16,
                boxShadow: '0 18px 42px rgba(16,32,56,0.08)',
              }}
            >
              <img
                alt={shot.alt}
                src={shot.src}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 18,
                  border: '1px solid rgba(16,32,56,0.08)',
                  display: 'block',
                }}
              />
              <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    color: '#102038',
                  }}
                >
                  {shot.title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: '#516176',
                  }}
                >
                  {shot.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="What to expect"
        title="Permission scope and pilot-install expectations."
        description="The extension stays tightly scoped to the rep workflow and keeps dealership CRM texting fully in place."
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <PolicyCard
            title="Permissions"
            body={`Repple uses the side panel, storage, scripting, and tab access needed to read the visible CRM page and keep the workflow inside Chrome.

Page access stays limited to the visible CRM experience so reps can generate a card from the current appointment page without leaving the dealership workflow.`}
          />
          <PolicyCard
            title="Privacy policy"
            body={`The public privacy policy URL for Repple is available at /privacy on the website.

Use that page for extension listing or pilot documentation until Chrome Web Store submission.`}
          />
          <PolicyCard
            title="Pilot usage"
            body={`Sign in with the same dealership account used in the web app. Owners and admins manage billing in the web app, and reps generate cards from the extension after the rooftop is active.`}
          />
        </div>
      </Section>
    </MarketingPageShell>
  );
}
