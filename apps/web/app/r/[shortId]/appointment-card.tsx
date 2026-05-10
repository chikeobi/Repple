'use client';

import { useEffect, useState, type ReactNode } from 'react';

import type { AppointmentRecord } from '../../../lib/repple';

const CARD_WIDTH = 430;
const CARD_HEIGHT = 760;
const PAGE_BACKGROUND = '#F5F7FB';
const CARD_BACKGROUND = '#FFFFFF';
const PRIMARY_BLUE = '#1848C6';
const DEEP_NAVY = '#172341';
const MUTED_TEXT = '#5D6C8B';
const LABEL_TEXT = '#B18942';
const SOFT_BORDER = 'rgba(23, 35, 65, 0.07)';
const SOFT_SHADOW = '0 18px 42px rgba(17, 28, 56, 0.08)';
const SOFT_CARD_SHADOW = '0 8px 24px rgba(17, 28, 56, 0.06)';
const SERIF_FAMILY =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, "Times New Roman", serif';

function buildDirectionsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function BrandMark() {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg aria-hidden="true" fill="none" height="56" viewBox="0 0 64 64" width="56">
        <rect
          height="42"
          rx="12"
          stroke={PRIMARY_BLUE}
          strokeWidth="3.5"
          width="36"
          x="14"
          y="10"
        />
        <path
          d="M23 18c0 13 2.7 24 9 24 6.3 0 9-11 9-24"
          stroke={PRIMARY_BLUE}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4.5"
        />
        <path d="M23 31h18" stroke={PRIMARY_BLUE} strokeLinecap="round" strokeWidth="4.5" />
      </svg>
    </div>
  );
}

function AdvisorAvatar() {
  return (
    <div
      style={{
        width: 68,
        height: 68,
        borderRadius: 999,
        flexShrink: 0,
        padding: 2,
        background: 'linear-gradient(180deg, #D3AF63 0%, #B88A2D 100%)',
        boxShadow: '0 6px 18px rgba(184, 138, 45, 0.22)',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 999,
          overflow: 'hidden',
          background:
            'radial-gradient(circle at 50% 18%, #f6f7fa 0%, #dfe5ef 50%, #c5cedd 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg aria-hidden="true" fill="none" height="68" viewBox="0 0 68 68" width="68">
          <defs>
            <linearGradient id="shirt" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#1E2A44" />
              <stop offset="100%" stopColor="#0E1527" />
            </linearGradient>
          </defs>
          <circle cx="34" cy="26" fill="#D6B190" r="12" />
          <path
            d="M23 50c2-8 7-12 11-12s9 4 11 12"
            fill="url(#shirt)"
            stroke="url(#shirt)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="10"
          />
          <path
            d="M25 23c0-6 4-11 9-11 6 0 10 5 10 11v3c-3-1-7-2-10-2-4 0-7 1-9 2v-3Z"
            fill="#3E2B20"
          />
          <path
            d="M28 29c2 2 4 3 6 3s4-1 6-3"
            stroke="#8C603F"
            strokeLinecap="round"
            strokeWidth="1.3"
          />
        </svg>
      </div>
    </div>
  );
}

function PlayButton() {
  return (
    <span
      style={{
        width: 74,
        height: 74,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 14px 32px rgba(17, 28, 56, 0.16)',
      }}
    >
      <svg aria-hidden="true" fill={PRIMARY_BLUE} height="28" viewBox="0 0 20 20" width="28">
        <path d="M7 4.5v11l8-5.5-8-5.5Z" />
      </svg>
    </span>
  );
}

function VideoCard({
  thumbnailUrl,
  onPlay,
}: {
  thumbnailUrl: string;
  onPlay: () => void;
}) {
  return (
    <div
      style={{
        position: 'relative',
        height: 220,
        overflow: 'hidden',
        borderRadius: 24,
        background: '#E7EDF7',
        boxShadow: SOFT_CARD_SHADOW,
      }}
    >
      <img
        alt=""
        src={thumbnailUrl}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <button
        aria-label="Play personal message"
        onClick={onPlay}
        type="button"
        style={{
          position: 'absolute',
          inset: 0,
          border: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.06))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <PlayButton />
      </button>
      <div
        style={{
          position: 'absolute',
          left: 14,
          bottom: 14,
          borderRadius: 12,
          background: 'rgba(34, 34, 34, 0.62)',
          backdropFilter: 'blur(10px)',
          padding: '8px 12px',
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        A personal message for you
      </div>
    </div>
  );
}

function IconBadge({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 999,
        flexShrink: 0,
        background: '#F7F1E8',
        color: PRIMARY_BLUE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}

function InfoCard({
  icon,
  label,
  title,
  detail,
  action,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        height: 74,
        borderRadius: 18,
        background: '#FFFFFF',
        border: `1px solid ${SOFT_BORDER}`,
        boxShadow: SOFT_CARD_SHADOW,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 16px',
      }}
    >
      <IconBadge>{icon}</IconBadge>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: LABEL_TEXT,
            fontWeight: 700,
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 15,
            lineHeight: 1.08,
            color: DEEP_NAVY,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 11,
            lineHeight: 1.15,
            color: MUTED_TEXT,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {detail}
        </p>
      </div>
      {action}
    </div>
  );
}

function ButtonIcon({
  variant,
}: {
  variant: 'confirm' | 'reschedule';
}) {
  return variant === 'confirm' ? (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 20 20" width="20">
      <rect
        height="15"
        rx="2.4"
        stroke="currentColor"
        strokeWidth="1.8"
        width="15"
        x="2.5"
        y="3.5"
      />
      <path d="M6 1.8v4M14 1.8v4M6.5 10l2.2 2.2L13.8 7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 20 20" width="20">
      <rect
        height="15"
        rx="2.4"
        stroke="currentColor"
        strokeWidth="1.8"
        width="15"
        x="2.5"
        y="3.5"
      />
      <path d="M6 1.8v4M14 1.8v4M9.2 12.6 13.8 8M12.2 7.9h1.6v1.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ActionButton({
  children,
  variant = 'primary',
  onClick,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
}) {
  const primary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        height: 52,
        width: '100%',
        borderRadius: 16,
        border: primary ? 'none' : `1.6px solid ${PRIMARY_BLUE}`,
        background: primary ? PRIMARY_BLUE : '#FFFFFF',
        color: primary ? '#FFFFFF' : PRIMARY_BLUE,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: primary ? '0 12px 28px rgba(24, 72, 198, 0.24)' : 'none',
      }}
    >
      <ButtonIcon variant={primary ? 'confirm' : 'reschedule'} />
      <span>{children}</span>
    </button>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="12" viewBox="0 0 16 16" width="12">
      <path
        d="M4.8 6V4.8a3.2 3.2 0 1 1 6.4 0V6M4.2 6h7.6v6.1H4.2V6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function SmileIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 20 20" width="16">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.4 11.6c1.2 1.2 2.4 1.8 3.6 1.8s2.4-.6 3.6-1.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <circle cx="7.4" cy="8" fill="currentColor" r="1" />
      <circle cx="12.6" cy="8" fill="currentColor" r="1" />
    </svg>
  );
}

function CloseButton({ embed = false }: { embed?: boolean }) {
  function handleClose() {
    if (embed && window.parent !== window) {
      window.parent.postMessage({ type: 'repple:close-card-preview' }, '*');
      return;
    }

    if (window.opener) {
      window.close();
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.close();
  }

  return (
    <button
      aria-label="Close card"
      onClick={handleClose}
      type="button"
      style={{
        position: 'absolute',
        top: 14,
        right: 14,
        width: 32,
        height: 32,
        borderRadius: 999,
        border: `1px solid ${SOFT_BORDER}`,
        background: 'rgba(255,255,255,0.94)',
        color: MUTED_TEXT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 8px 20px rgba(17, 28, 56, 0.06)',
      }}
    >
      <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 20 20" width="14">
        <path
          d="M5 5l10 10M15 5 5 15"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    </button>
  );
}

export function AppointmentCard({
  initialRecord,
  embed = false,
}: {
  initialRecord: AppointmentRecord;
  embed?: boolean;
}) {
  const [record, setRecord] = useState(initialRecord);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      const widthScale = (window.innerWidth - 24) / CARD_WIDTH;
      const heightScale = (window.innerHeight - 24) / CARD_HEIGHT;
      setScale(Math.min(1, widthScale, heightScale));
    }

    updateScale();
    window.addEventListener('resize', updateScale);

    return () => {
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  useEffect(() => {
    if (record.videoStatus === 'ready') {
      return;
    }

    const remainingMs = Math.max(new Date(record.videoReadyAt).getTime() - Date.now(), 0);

    if (remainingMs === 0) {
      setRecord((current) => ({ ...current, videoStatus: 'ready' }));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRecord((current) => ({ ...current, videoStatus: 'ready' }));
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [record.videoReadyAt, record.videoStatus]);

  return (
    <main
      style={{
        position: embed ? 'relative' : 'fixed',
        inset: embed ? undefined : 0,
        width: embed ? '100%' : '100vw',
        height: embed ? '100%' : '100vh',
        minHeight: embed ? '100%' : undefined,
        overflow: embed ? 'visible' : 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: embed ? 'transparent' : PAGE_BACKGROUND,
      }}
    >
      <div
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          transform: embed ? undefined : `scale(${scale})`,
          transformOrigin: embed ? undefined : 'center center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            borderRadius: 32,
            overflow: 'hidden',
            background: CARD_BACKGROUND,
            boxShadow: SOFT_SHADOW,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <CloseButton embed={embed} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingTop: 2,
              paddingRight: 42,
            }}
          >
            <BrandMark />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: 4,
                minWidth: 0,
                flex: 1,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  lineHeight: 1.05,
                  fontWeight: 700,
                  color: DEEP_NAVY,
                  letterSpacing: '-0.03em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {record.dealershipName}
              </p>
              <span style={{ fontSize: 11, color: MUTED_TEXT, lineHeight: 1 }}>
                Real People. Real Service.
              </span>
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '2px 6px 0',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: SERIF_FAMILY,
                fontSize: 34,
                lineHeight: 1.02,
                fontWeight: 700,
                letterSpacing: '-0.05em',
                color: DEEP_NAVY,
              }}
            >
              <span style={{ color: PRIMARY_BLUE }}>{record.firstName}, </span>
              your vehicle is reserved.
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: 1.35,
                color: MUTED_TEXT,
              }}
            >
              We can&apos;t wait to show you everything in person.
            </p>
          </div>

          <VideoCard
            onPlay={() => window.open(record.videoUrl, '_blank', 'noopener,noreferrer')}
            thumbnailUrl={record.videoThumbnailUrl}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              minHeight: 72,
              padding: '2px 2px 0',
            }}
          >
            <AdvisorAvatar />
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.05,
                  fontWeight: 700,
                  color: DEEP_NAVY,
                }}
              >
                {record.salespersonName}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  lineHeight: 1.2,
                  color: MUTED_TEXT,
                }}
              >
                Your Sales Advisor
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 10,
                  lineHeight: 1.25,
                  color: DEEP_NAVY,
                }}
              >
                I&apos;ve got everything ready for you. See you soon!
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <InfoCard
              icon={
                <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 28 28" width="22">
                  <path
                    d="M5.5 16.7h17l-1.3-5.3a3 3 0 0 0-3-2.3H9.8a3 3 0 0 0-3 2.3l-1.3 5.3ZM4.6 16.7h18.8a2.6 2.6 0 0 1 2.6 2.6v1.2H2v-1.2a2.6 2.6 0 0 1 2.6-2.6Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.85"
                  />
                  <circle cx="7.6" cy="21.2" fill="currentColor" r="1.8" />
                  <circle cx="20.4" cy="21.2" fill="currentColor" r="1.8" />
                </svg>
              }
              label="Vehicle"
              title={record.vehicle}
              detail="Prepared and waiting for you"
            />
            <InfoCard
              icon={
                <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
                  <rect
                    height="16"
                    rx="2.6"
                    stroke="currentColor"
                    strokeWidth="1.85"
                    width="18"
                    x="3"
                    y="5"
                  />
                  <path
                    d="M7 3v4M17 3v4M7 11h10M8.5 15h.01M12 15h.01M15.5 15h.01"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.85"
                  />
                </svg>
              }
              label="Appointment"
              title={record.appointmentTime}
              detail="Reserved time just for you"
            />
            <InfoCard
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
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    flexShrink: 0,
                    border: `1px solid rgba(23, 35, 65, 0.18)`,
                    background: '#FFFFFF',
                    color: PRIMARY_BLUE,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg aria-hidden="true" fill="currentColor" height="16" viewBox="0 0 20 20" width="16">
                    <path d="M16.8 3.6 3.8 8.5c-.7.2-.7 1.2 0 1.4l4.8 1.5 1.5 4.8c.2.7 1.2.7 1.4 0l4.9-13c.2-.6-.4-1.1-1-.9Z" />
                  </svg>
                </button>
              }
              detail={record.dealershipAddress}
              icon={
                <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
                  <path
                    d="M12 20c4-4.2 6-7.2 6-10a6 6 0 1 0-12 0c0 2.8 2 5.8 6 10Z"
                    stroke="currentColor"
                    strokeWidth="1.85"
                  />
                  <circle cx="12" cy="10" fill="currentColor" r="2.1" />
                </svg>
              }
              label="Dealership"
              title={record.dealershipName}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ActionButton onClick={() => {}}>Confirm Appointment</ActionButton>
            <ActionButton onClick={() => {}} variant="secondary">
              Reschedule
            </ActionButton>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              color: MUTED_TEXT,
              fontSize: 10,
              lineHeight: 1,
              paddingTop: 2,
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LockIcon />
              <span>Secure. Private. Just for you.</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span>Powered by</span>
              <span style={{ color: DEEP_NAVY, fontWeight: 700 }}>Repple</span>
              <span style={{ color: LABEL_TEXT }}>
                <SmileIcon />
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
