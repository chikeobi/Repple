'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AppointmentRecord, VideoGenerationStatus } from '../../../lib/repple';

type CustomerAction = 'confirmed' | 'reschedule' | null;

const statusCopy = {
  confirmed:
    'Appointment confirmed. In the full product, this would notify the salesperson instantly.',
  reschedule:
    'Reschedule request captured for the demo. In production, this would open the handoff flow.',
};

const pageStyle = {
  minHeight: '100vh',
  padding: 16,
  display: 'flex',
  justifyContent: 'center',
  background: '#f5f8fc',
} as const;

const cardStyle = {
  width: '100%',
  maxWidth: 430,
  borderRadius: 24,
  background: '#ffffff',
  border: '1px solid #e5eaf1',
  boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
  padding: 22,
} as const;

const stackStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
} as const;

function buildDirectionsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function DealershipGlyph() {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        border: '1px solid #d8e2f0',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
      }}
    >
      <svg aria-hidden="true" fill="none" height="28" viewBox="0 0 28 28" width="28">
        <rect
          height="22"
          rx="7"
          stroke="#1473FF"
          strokeWidth="2.2"
          width="22"
          x="3"
          y="3"
        />
        <path
          d="M9 6.5v15M19 6.5v15M9 14c1.6 1.9 3.1 2.8 5 2.8 1.9 0 3.4-.9 5-2.8"
          stroke="#1473FF"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
      </svg>
    </div>
  );
}

function PersonAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'S';

  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 999,
        flexShrink: 0,
        border: '1px solid #e5eaf1',
        background: 'linear-gradient(180deg, #edf3fb 0%, #dfe7f2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          background: 'radial-gradient(circle at top, #ffffff 0%, #e6edf6 72%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontWeight: 600,
          color: '#0f172a',
        }}
      >
        {initial}
      </div>
    </div>
  );
}

function DetailIcon({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 999,
        flexShrink: 0,
        border: '1px solid #e5eaf1',
        background: '#f8fbff',
        color: '#1473ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  detail,
  action,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        borderRadius: 18,
        border: '1px solid #e5eaf1',
        background: '#ffffff',
        padding: 16,
      }}
    >
      <DetailIcon>{icon}</DetailIcon>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#64748b',
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 21,
            lineHeight: 1.15,
            fontWeight: 700,
            color: '#0f172a',
          }}
        >
          {value}
        </p>
        {detail ? (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 16,
              lineHeight: 1.4,
              color: '#64748b',
            }}
          >
            {detail}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function VideoCard({
  status,
  thumbnailUrl,
  onPlay,
}: {
  status: VideoGenerationStatus;
  thumbnailUrl: string;
  onPlay: () => void;
}) {
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        borderRadius: 18,
        border: '1px solid #e5eaf1',
        background: '#edf3fa',
      }}
    >
      <img
        alt=""
        src={thumbnailUrl}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(15,23,42,0.02) 0%, rgba(15,23,42,0.18) 100%)',
        }}
      />

      {status === 'processing' ? (
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 16,
            borderRadius: 16,
            border: '1px solid #e5eaf1',
            background: 'rgba(255,255,255,0.96)',
            padding: 16,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: '#1473ff',
              }}
            />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
              Generating personalized video...
            </p>
          </div>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 14,
              lineHeight: 1.45,
              color: '#64748b',
            }}
          >
            Creating a personal welcome clip for this appointment.
          </p>
          <div
            style={{
              marginTop: 12,
              height: 6,
              overflow: 'hidden',
              borderRadius: 999,
              background: '#e5eaf1',
            }}
          >
            <div className="repple-progress-bar" style={{ height: '100%', width: '50%', borderRadius: 999, background: '#1473ff' }} />
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={onPlay}
            type="button"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 72,
                height: 72,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.96)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 40px rgba(15, 23, 42, 0.14)',
              }}
            >
              <svg aria-hidden="true" fill="#1473ff" height="26" viewBox="0 0 20 20" width="26">
                <path d="M7 4.5v11l8-5.5-8-5.5Z" />
              </svg>
            </span>
          </button>
          <div
            style={{
              position: 'absolute',
              left: 16,
              bottom: 16,
              borderRadius: 14,
              background: 'rgba(15,23,42,0.76)',
              padding: '8px 12px',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            A personal message for you
          </div>
        </>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = 'primary',
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={
        variant === 'primary'
          ? {
              height: 56,
              width: '100%',
              borderRadius: 18,
              border: 0,
              background: '#1473ff',
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 600,
              boxShadow: '0 12px 30px rgba(20, 115, 255, 0.24)',
              cursor: 'pointer',
            }
          : {
              height: 56,
              width: '100%',
              borderRadius: 18,
              border: '1px solid #1473ff',
              background: '#ffffff',
              color: '#1473ff',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
            }
      }
    >
      {children}
    </button>
  );
}

function FooterLock() {
  return (
    <svg aria-hidden="true" fill="none" height="15" viewBox="0 0 16 16" width="15">
      <path
        d="M4.7 6V4.8a3.3 3.3 0 1 1 6.6 0V6M4.3 6h7.4v6.4H4.3V6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function FooterSmile() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 11.8c1.1 1.2 2.2 1.8 3.5 1.8s2.4-.6 3.5-1.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <circle cx="7.3" cy="8" fill="currentColor" r="1" />
      <circle cx="12.7" cy="8" fill="currentColor" r="1" />
    </svg>
  );
}

export function AppointmentCard({ initialRecord }: { initialRecord: AppointmentRecord }) {
  const [record, setRecord] = useState(initialRecord);
  const [customerAction, setCustomerAction] = useState<CustomerAction>(null);

  const remainingMs = useMemo(() => {
    if (record.videoStatus === 'ready') {
      return 0;
    }

    return Math.max(new Date(record.videoReadyAt).getTime() - Date.now(), 0);
  }, [record]);

  useEffect(() => {
    if (record.videoStatus === 'ready' || remainingMs === 0) {
      if (record.videoStatus !== 'ready' && remainingMs === 0) {
        setRecord((current) => ({ ...current, videoStatus: 'ready' }));
      }

      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRecord((current) => ({ ...current, videoStatus: 'ready' }));
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [record.videoStatus, remainingMs]);

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={stackStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
            <DealershipGlyph />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#0f172a',
                }}
              >
                {record.dealershipName}
              </p>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.35, color: '#64748b' }}>
                Real People. Real Service.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 34,
                lineHeight: 1.05,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                color: '#0f172a',
              }}
            >
              <span style={{ color: '#1473ff' }}>{record.firstName},</span> your vehicle is
              reserved.
            </h1>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.45, color: '#64748b' }}>
              We can&apos;t wait to show you everything in person.
            </p>
          </div>

          <VideoCard
            onPlay={() => window.open(record.videoUrl, '_blank', 'noopener,noreferrer')}
            status={record.videoStatus}
            thumbnailUrl={record.videoThumbnailUrl}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              borderRadius: 18,
              border: '1px solid #e5eaf1',
              background: '#ffffff',
              padding: 16,
            }}
          >
            <PersonAvatar name={record.salespersonName} />
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 21,
                  lineHeight: 1.15,
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                {record.salespersonName}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 16, lineHeight: 1.35, color: '#64748b' }}>
                Your Sales Advisor
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 16, lineHeight: 1.45, color: '#0f172a' }}>
                I&apos;ve got everything ready for you. See you soon!
              </p>
            </div>
          </div>

          <DetailRow
            icon={
              <svg aria-hidden="true" fill="none" height="26" viewBox="0 0 28 28" width="26">
                <path
                  d="M5.5 16.7h17l-1.3-5.3a3 3 0 0 0-3-2.3H9.8a3 3 0 0 0-3 2.3l-1.3 5.3ZM4.6 16.7h18.8a2.6 2.6 0 0 1 2.6 2.6v1.2H2v-1.2a2.6 2.6 0 0 1 2.6-2.6Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.9"
                />
                <circle cx="7.6" cy="21.2" fill="currentColor" r="1.8" />
                <circle cx="20.4" cy="21.2" fill="currentColor" r="1.8" />
              </svg>
            }
            label="Vehicle"
            value={record.vehicle}
            detail="Prepared and ready for your arrival"
          />

          <DetailRow
            icon={
              <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
                <rect
                  height="16"
                  rx="2.6"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  width="18"
                  x="3"
                  y="5"
                />
                <path
                  d="M7 3v4M17 3v4M7 11h10M8.5 15h.01M12 15h.01M15.5 15h.01"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.9"
                />
              </svg>
            }
            label="Appointment"
            value={record.appointmentTime}
            detail="Please arrive 5 minutes early"
          />

          <DetailRow
            icon={
              <svg aria-hidden="true" fill="none" height="26" viewBox="0 0 24 24" width="26">
                <path
                  d="M12 20c4-4.2 6-7.2 6-10a6 6 0 1 0-12 0c0 2.8 2 5.8 6 10Z"
                  stroke="currentColor"
                  strokeWidth="1.9"
                />
                <circle cx="12" cy="10" fill="currentColor" r="2.1" />
              </svg>
            }
            label="Dealership"
            value={record.dealershipName}
            detail={record.dealershipAddress}
            action={
              <button
                aria-label="Open maps"
                onClick={() =>
                  window.open(
                    buildDirectionsUrl(record.dealershipAddress),
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
                type="button"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  flexShrink: 0,
                  border: '1px solid #e5eaf1',
                  background: '#f8fbff',
                  color: '#1473ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 20 20" width="18">
                  <path d="M16.8 3.6 3.8 8.5c-.7.2-.7 1.2 0 1.4l4.8 1.5 1.5 4.8c.2.7 1.2.7 1.4 0l4.9-13c.2-.6-.4-1.1-1-.9Z" />
                </svg>
              </button>
            }
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {customerAction ? (
              <div
                style={{
                  borderRadius: 18,
                  border: '1px solid #dce8fb',
                  background: '#f5f9ff',
                  padding: '12px 16px',
                  fontSize: 14,
                  lineHeight: 1.45,
                  color: '#0f172a',
                }}
              >
                {statusCopy[customerAction]}
              </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <ActionButton onClick={() => setCustomerAction('confirmed')}>Confirm</ActionButton>
              <ActionButton onClick={() => setCustomerAction('reschedule')} variant="secondary">
                Reschedule
              </ActionButton>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              paddingTop: 18,
              borderTop: '1px solid #e5eaf1',
              fontSize: 13,
              color: '#64748b',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <FooterLock />
              <span>Secure. Private. Just for you.</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>Powered by</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>Repple</span>
              <span style={{ color: '#1473ff' }}>
                <FooterSmile />
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
