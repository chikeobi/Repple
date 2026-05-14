import type { Metadata } from 'next';

import {
  CtaBand,
  FeatureGrid,
  HomeHero,
  MarketingPageShell,
  PricingTierGrid,
  SampleCardSection,
  Section,
  WorkflowSteps,
} from '../lib/marketing-site';

export const metadata: Metadata = {
  title: 'Repple | Personalized Appointment Cards for Dealership Reps',
  description:
    'Repple helps dealership reps create personalized appointment cards from CRM data and paste the message into their existing CRM texting workflow.',
};

export default function HomePage() {
  return (
    <MarketingPageShell currentPath="/">
      <HomeHero />

      <Section
        eyebrow="What Repple does"
        title="One fast workflow for a better appointment handoff."
        description="Repple turns visible CRM data into a compact appointment card, public link, preview image, and copy-ready message that reps can paste into the dealership’s current texting tool."
      >
        <FeatureGrid
          items={[
            {
              title: 'Auto-fill from the CRM page',
              body: 'Repple reads the visible CRM page, pulls customer and vehicle details, and keeps the form editable before generation.',
            },
            {
              title: 'Generate a premium card',
              body: 'The customer receives a compact appointment card with dealership branding, vehicle details, arrival time, and action buttons.',
            },
            {
              title: 'Create the public link and preview image',
              body: 'Each appointment gets a shareable public link and preview-ready image that match the same card experience.',
            },
            {
              title: 'Keep the dealership texting workflow',
              body: 'Reps paste Repple’s message into the dealership CRM. Repple does not send SMS and does not run a messaging inbox.',
            },
          ]}
        />
      </Section>

      <Section
        eyebrow="Dealership workflow"
        title="Designed for the way reps already work."
        description="The product fits the current CRM process instead of asking the store to replace it."
      >
        <WorkflowSteps
          steps={[
            {
              title: 'Open the CRM page',
              body: 'A rep opens the customer or appointment page inside the dealership CRM.',
            },
            {
              title: 'Use Repple in the side panel',
              body: 'Repple opens in the side panel, autofills the form, and keeps every field editable.',
            },
            {
              title: 'Generate the appointment card',
              body: 'The rep creates the card, link, image, and copy-ready message from the same screen.',
            },
            {
              title: 'Paste into CRM texting',
              body: 'The rep copies the message and pastes it into the dealership’s existing CRM texting system.',
            },
          ]}
        />
      </Section>

      <Section
        eyebrow="Sample card"
        title="The customer-facing card is part of the product, not a separate demo."
        description="The same card system powers public pages, previews, and dealership-facing demos."
      >
        <SampleCardSection />
      </Section>

      <Section
        eyebrow="Benefits"
        title="Built for speed, consistency, and dealership trust."
        description="Repple stays focused on the appointment handoff instead of trying to become a full CRM replacement."
      >
        <FeatureGrid
          items={[
            {
              title: 'Faster rep workflow',
              body: 'Reps can create a polished appointment handoff without rewriting the same message for every customer.',
            },
            {
              title: 'More consistent dealership presentation',
              body: 'Every generated card uses the dealership’s name, brand color, and rep details instead of a loose text thread.',
            },
            {
              title: 'Clear customer actions',
              body: 'Customers can confirm or request a new time directly from the card while the store keeps the original CRM texting flow.',
            },
            {
              title: 'Measurable usage',
              body: 'Dealerships can see whether cards are being created, opened, copied, viewed, confirmed, and rescheduled.',
            },
          ]}
        />
      </Section>

      <Section
        eyebrow="Pricing tiers"
        title="Three clear ways to roll Repple into a dealership."
        description="The website now shows the public pricing structure directly: Core for a single-rooftop rollout, Pro for a broader store rollout, and Elite for custom dealer-group planning."
      >
        <PricingTierGrid />
      </Section>

      <Section
        eyebrow="Next step"
        title="Choose the path that fits your rollout."
        description="Review pricing, request a workflow demo, or move straight into the extension install path."
      >
        <CtaBand />
      </Section>
    </MarketingPageShell>
  );
}
