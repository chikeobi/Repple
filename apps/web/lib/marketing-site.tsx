import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { AppointmentCard } from '../components/AppointmentCard';
import { createSharedAppointmentRecord } from '../../../shared/appointment-record';
import { buildVehicleImageRenderUrl } from '../../../shared/vehicle-images';
import { getSiteUrl } from './env';

const SITE_URL = getSiteUrl();
const SERIF_FAMILY =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, "Times New Roman", serif';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/demo', label: 'Demo' },
  { href: '/install', label: 'Install' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const;

const FOOTER_LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/demo', label: 'Demo' },
  { href: '/install', label: 'Install' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/app', label: 'Open App' },
] as const;

const sampleRecord = createSharedAppointmentRecord(
  {
    firstName: 'Taylor',
    vehicle: '2024 Ford F-150 Lariat',
    appointmentTime: 'Saturday, May 18 at 10:30 AM',
    salespersonName: 'Mike Anderson',
    dealershipName: 'North Coast Auto',
    dealershipAddress: '12345 Katy Freeway, Houston, TX 77079',
  },
  {
    buildPublicLandingPageUrl: (id) => `${SITE_URL}/r/${id}`,
    buildPreviewImageUrl: (id) => `${SITE_URL}/r/${id}/preview-image`,
  },
  {
    id: 'DEMO12',
    createdAt: '2026-05-10T15:00:00.000Z',
    vehicleImage: {
      url: buildVehicleImageRenderUrl('2024 Ford F-150 Lariat', SITE_URL),
      provider: 'fallback',
      sourcePageUrl: null,
      confidence: 'high',
    },
    defaults: {
      dealershipLogoUrl: null,
      dealershipBrandColor: '#A35C2C',
      dealershipAddress: '12345 Katy Freeway, Houston, TX 77079',
      salespersonTitle: 'Senior Sales Advisor',
      smsTemplate:
        'Hey {{firstName}}, your appointment card is ready for {{appointmentTime}}. {{landingPageUrl}}',
    },
  },
);

sampleRecord.salespersonTitle = 'Senior Sales Advisor';

const DEFAULT_PRICING_TIERS = [
  {
    name: 'Core',
    price: '$499',
    cadence: '/mo',
    summary: 'For one rooftop proving the workflow with a focused rep group.',
    bullets: [
      'CRM side-panel workflow',
      'Appointment cards, links, and preview images',
      'Dealership branding and rep profiles',
      'Customer confirm and reschedule actions',
    ],
    ctaHref: '/app',
    ctaLabel: 'Start With Core',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$999',
    cadence: '/mo',
    summary: 'For stores that want broader rep usage and a stronger rollout motion.',
    bullets: [
      'Everything in Core',
      'Higher rep and card capacity',
      'Activity visibility across the rooftop',
      'Better fit for active pilot-to-rollout usage',
    ],
    ctaHref: '/app',
    ctaLabel: 'Start With Pro',
    featured: true,
  },
  {
    name: 'Elite',
    price: 'Custom',
    cadence: '',
    summary: 'For dealer groups or custom rollout needs that need direct planning.',
    bullets: [
      'Custom onboarding path',
      'Multi-store rollout planning',
      'Custom limits and support expectations',
      'Quoted directly based on rollout shape',
    ],
    ctaHref: '/demo',
    ctaLabel: 'Request Demo',
    featured: false,
  },
] as const;

function shellStyle(): CSSProperties {
  return {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top left, rgba(243,226,206,0.9) 0%, rgba(245,248,252,0.96) 34%, #f8fbff 100%)',
    color: '#102038',
  };
}

function containerStyle(): CSSProperties {
  return {
    width: '100%',
    maxWidth: 1180,
    margin: '0 auto',
    padding: '0 16px',
  };
}

function navLinkStyle(active = false): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    padding: '0 14px',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 700,
    background: active ? 'rgba(163,92,44,0.12)' : 'transparent',
    color: active ? '#7e4419' : '#45556f',
  };
}

function ctaStyle(primary = true): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    padding: '12px 18px',
    borderRadius: 16,
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: '-0.01em',
    background: primary ? '#102038' : '#ffffff',
    color: primary ? '#ffffff' : '#102038',
    border: primary ? 'none' : '1px solid rgba(16,32,56,0.1)',
    boxShadow: primary ? '0 16px 32px rgba(16,32,56,0.14)' : 'none',
  };
}

function sectionTitleStyle(): CSSProperties {
  return {
    margin: 0,
    fontFamily: SERIF_FAMILY,
    fontSize: 'clamp(2rem, 4vw, 3.4rem)',
    lineHeight: 0.96,
    letterSpacing: '-0.05em',
    color: '#102038',
  };
}

function sectionCardStyle(): CSSProperties {
  return {
    borderRadius: 28,
    background: 'rgba(255,255,255,0.82)',
    border: '1px solid rgba(16,32,56,0.08)',
    boxShadow: '0 24px 56px rgba(16,32,56,0.08)',
    padding: 24,
    backdropFilter: 'blur(10px)',
  };
}

function SmallTag({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '7px 11px',
        background: 'rgba(163,92,44,0.12)',
        color: '#7e4419',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

function PageHeader({ currentPath }: { currentPath: string }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 20 }}>
      <div style={{ ...containerStyle(), paddingTop: 18 }}>
        <div
          style={{
            borderRadius: 22,
            background: 'rgba(255,255,255,0.76)',
            border: '1px solid rgba(16,32,56,0.08)',
            boxShadow: '0 16px 42px rgba(16,32,56,0.07)',
            backdropFilter: 'blur(14px)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: 'linear-gradient(180deg, #A35C2C 0%, #7E4419 100%)',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 12px 28px rgba(126,68,25,0.24)',
                fontWeight: 900,
              }}
            >
              R
            </div>
            <div style={{ display: 'grid', gap: 2 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#102038' }}>Repple</span>
              <span style={{ fontSize: 12, color: '#667790' }}>
                Personalized dealership appointment cards
              </span>
            </div>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {NAV_LINKS.map((link) => (
              <Link
                href={link.href}
                key={link.href}
                style={navLinkStyle(currentPath === link.href)}
              >
                {link.label}
              </Link>
            ))}
          <Link href="/app" style={ctaStyle(true)}>
            Open App
          </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

function PageFooter() {
  return (
    <footer style={{ borderTop: '1px solid rgba(16,32,56,0.08)', marginTop: 48 }}>
      <div
        style={{
          ...containerStyle(),
          paddingTop: 24,
          paddingBottom: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: 5 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#102038' }}>Repple</span>
          <span style={{ fontSize: 13, lineHeight: 1.6, color: '#667790' }}>
            Repple helps dealership reps create personalized appointment cards from CRM data and
            paste them into existing CRM texting.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {FOOTER_LINKS.map((link) => (
            <Link href={link.href} key={link.href} style={{ fontSize: 13, color: '#45556f' }}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

export function MarketingPageShell({
  currentPath,
  children,
}: {
  currentPath: string;
  children: ReactNode;
}) {
  return (
    <main style={shellStyle()}>
      <PageHeader currentPath={currentPath} />
      {children}
      <PageFooter />
    </main>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ ...containerStyle(), paddingTop: 40 }}>
      <div style={{ display: 'grid', gap: 14 }}>
        {eyebrow ? <SmallTag>{eyebrow}</SmallTag> : null}
        <h2 style={sectionTitleStyle()}>{title}</h2>
        {description ? (
          <p
            style={{
              margin: 0,
              maxWidth: 760,
              fontSize: 17,
              lineHeight: 1.75,
              color: '#51627c',
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      <div style={{ height: 20 }} />
      {children}
    </section>
  );
}

export function FeatureGrid({
  items,
}: {
  items: Array<{ title: string; body: string }>;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
      }}
    >
      {items.map((item) => (
        <div key={item.title} style={sectionCardStyle()}>
          <p
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.2,
              color: '#102038',
            }}
          >
            {item.title}
          </p>
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 14,
              lineHeight: 1.7,
              color: '#5e6f88',
            }}
          >
            {item.body}
          </p>
        </div>
      ))}
    </div>
  );
}

export function WorkflowSteps({
  steps,
}: {
  steps: Array<{ title: string; body: string }>;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: 16,
      }}
    >
      {steps.map((step, index) => (
        <div key={step.title} style={sectionCardStyle()}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              background: 'rgba(16,32,56,0.08)',
              color: '#102038',
              display: 'grid',
              placeItems: 'center',
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            0{index + 1}
          </div>
          <p
            style={{
              margin: '14px 0 0',
              fontSize: 18,
              fontWeight: 800,
              color: '#102038',
            }}
          >
            {step.title}
          </p>
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 14,
              lineHeight: 1.7,
              color: '#5e6f88',
            }}
          >
            {step.body}
          </p>
        </div>
      ))}
    </div>
  );
}

export function SampleCardSection() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: 22,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={sectionCardStyle()}>
          <p
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: '#102038',
            }}
          >
            Repple does not send the text.
          </p>
          <p
            style={{
              margin: '12px 0 0',
              fontSize: 15,
              lineHeight: 1.8,
              color: '#5e6f88',
            }}
          >
            Reps use Repple to generate the appointment card, public link, preview image, and
            copy-ready message. Then they paste the message into the dealership&apos;s existing CRM
            texting tool.
          </p>
        </div>
        <div style={sectionCardStyle()}>
          <p style={{ margin: 0, fontSize: 13, color: '#7e4419', fontWeight: 800 }}>
            Copy-ready CRM message
          </p>
          <div
            style={{
              marginTop: 12,
              borderRadius: 18,
              background: '#fffaf3',
              border: '1px solid rgba(163,92,44,0.14)',
              padding: 16,
              fontSize: 14,
              lineHeight: 1.75,
              color: '#3f4f68',
              whiteSpace: 'pre-line',
            }}
          >
            {sampleRecord.smsText}
          </div>
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: 8 }}>
        <AppointmentCard
          embed
          initialRecord={sampleRecord}
          showActionButtons={false}
          showCloseButton={false}
        />
      </div>
    </div>
  );
}

export function CtaBand() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
      }}
    >
      <div style={sectionCardStyle()}>
        <SmallTag>Pricing CTA</SmallTag>
        <p style={{ margin: '14px 0 0', fontSize: 22, fontWeight: 800, color: '#102038' }}>
          Choose the rooftop plan that fits the store.
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.7, color: '#5e6f88' }}>
          Review Core, Pro, and Elite pricing without changing the dealership texting workflow.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/pricing" style={ctaStyle(true)}>
            View Pricing
          </Link>
        </div>
      </div>
      <div style={sectionCardStyle()}>
        <SmallTag>Book Demo CTA</SmallTag>
        <p style={{ margin: '14px 0 0', fontSize: 22, fontWeight: 800, color: '#102038' }}>
          Walk through the workflow before rollout.
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.7, color: '#5e6f88' }}>
          Review the rep flow, customer card, and dealership messaging position in one guided
          overview.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/demo" style={ctaStyle(false)}>
            Request Demo
          </Link>
        </div>
      </div>
      <div style={sectionCardStyle()}>
        <SmallTag>Install Extension CTA</SmallTag>
        <p style={{ margin: '14px 0 0', fontSize: 22, fontWeight: 800, color: '#102038' }}>
          Use the extension inside the CRM workflow.
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.7, color: '#5e6f88' }}>
          Repple opens in the side panel, autofills from the CRM page, and generates the card in
          seconds.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/install" style={ctaStyle(true)}>
            Install Extension
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PolicyCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div style={sectionCardStyle()}>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#102038' }}>{title}</p>
      <p
        style={{
          margin: '12px 0 0',
          fontSize: 15,
          lineHeight: 1.85,
          color: '#5e6f88',
          whiteSpace: 'pre-line',
        }}
      >
        {body}
      </p>
    </div>
  );
}

export function HeroActions() {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Link href="/pricing" style={ctaStyle(true)}>
        View Pricing
      </Link>
      <Link href="/demo" style={ctaStyle(false)}>
        Request Demo
      </Link>
      <Link href="/install" style={ctaStyle(false)}>
        Install Extension
      </Link>
    </div>
  );
}

export function PricingTierGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
        gap: 18,
        alignItems: 'stretch',
      }}
    >
      {DEFAULT_PRICING_TIERS.map((tier) => (
        <div
          key={tier.name}
          style={{
            ...sectionCardStyle(),
            background: tier.featured ? '#102038' : 'rgba(255,255,255,0.82)',
            color: tier.featured ? '#ffffff' : '#102038',
            border: tier.featured
              ? '1px solid rgba(16,32,56,0.24)'
              : '1px solid rgba(16,32,56,0.08)',
            boxShadow: tier.featured
              ? '0 28px 64px rgba(16,32,56,0.16)'
              : '0 24px 56px rgba(16,32,56,0.08)',
            display: 'grid',
            gap: 14,
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 999,
                padding: '6px 10px',
                background: tier.featured ? 'rgba(255,255,255,0.12)' : 'rgba(163,92,44,0.12)',
                color: tier.featured ? '#ffffff' : '#7e4419',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                width: 'fit-content',
              }}
            >
              {tier.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: tier.price === 'Custom' ? 40 : 54,
                  lineHeight: 0.92,
                  fontWeight: 900,
                  letterSpacing: '-0.06em',
                }}
              >
                {tier.price}
              </span>
              {tier.cadence ? (
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: tier.featured ? 'rgba(255,255,255,0.78)' : '#51627c',
                  }}
                >
                  {tier.cadence}
                </span>
              ) : null}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.7,
                color: tier.featured ? 'rgba(255,255,255,0.82)' : '#5e6f88',
              }}
            >
              {tier.summary}
            </p>
          </div>

          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 14,
              lineHeight: 1.9,
              color: tier.featured ? 'rgba(255,255,255,0.88)' : '#5e6f88',
            }}
          >
            {tier.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>

          <div style={{ marginTop: 'auto' }}>
            <Link
              href={tier.ctaHref}
              style={{
                ...ctaStyle(!tier.featured),
                width: '100%',
                justifyContent: 'center',
                background: tier.featured ? '#ffffff' : '#102038',
                color: tier.featured ? '#102038' : '#ffffff',
              }}
            >
              {tier.ctaLabel}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeHero() {
  return (
    <section style={{ ...containerStyle(), paddingTop: 44, paddingBottom: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: 24,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <SmallTag>CRM appointment cards for dealership reps</SmallTag>
          <h1
            style={{
              margin: 0,
              fontFamily: SERIF_FAMILY,
              fontSize: 'clamp(3rem, 8vw, 5.8rem)',
              lineHeight: 0.9,
              letterSpacing: '-0.06em',
              color: '#102038',
            }}
          >
            Create a premium appointment card from CRM data in under 10 seconds.
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 680,
              fontSize: 18,
              lineHeight: 1.8,
              color: '#51627c',
            }}
          >
            Repple helps dealership reps open a CRM page, generate a personalized appointment card,
            and paste the copy-ready message into their existing CRM texting system. Repple does not
            send SMS and does not replace the CRM.
          </p>
          <HeroActions />
        </div>

        <div
          style={{
            ...sectionCardStyle(),
            padding: 18,
            display: 'grid',
            gap: 12,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#7e4419' }}>
            What reps generate
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            {[
              'Appointment card',
              'Public link',
              'Preview image',
              'Copy-ready message',
            ].map((item) => (
              <div
                key={item}
                style={{
                  borderRadius: 16,
                  background: '#ffffff',
                  border: '1px solid rgba(16,32,56,0.07)',
                  padding: 14,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#102038',
                }}
              >
                {item}
              </div>
            ))}
          </div>
          <div
            style={{
              borderRadius: 18,
              background: '#102038',
              color: '#ffffff',
              padding: 16,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, opacity: 0.72 }}>North star</p>
            <p style={{ margin: '8px 0 0', fontSize: 16, lineHeight: 1.7 }}>
              Personalized CRM-sourced appointment cards without changing the dealership texting
              system.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
