'use client';

import { useEffect, useState, type ReactNode } from 'react';

import type { AppointmentRecord } from '../shared/repple-contract';

const CARD_WIDTH = 430;
const CARD_HEIGHT = 736;
const PAGE_BACKGROUND = '#F5F7FB';
const CARD_BACKGROUND = '#FFFFFF';
const PRIMARY_BLUE = '#1848C6';
const DEEP_NAVY = '#172341';
const MUTED_TEXT = '#5D6C8B';
const SOFT_BORDER = 'rgba(23, 35, 65, 0.07)';
const SOFT_SHADOW = '0 18px 42px rgba(17, 28, 56, 0.08)';
const SOFT_CARD_SHADOW = '0 8px 24px rgba(17, 28, 56, 0.06)';
const SERIF_FAMILY =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, "Times New Roman", serif';

function resolveAccentColor(value: string | null) {
  const normalized = value?.trim() ?? '';

  if (/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(normalized)) {
    return normalized;
  }

  return PRIMARY_BLUE;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return `rgba(24, 72, 198, ${alpha})`;
  }

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatActionTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function buildRescheduleRequestNote(preferredTime: string, message: string) {
  const normalizedPreferredTime = preferredTime.trim();
  const normalizedMessage = message.trim();
  const lines = [`Preferred time: ${normalizedPreferredTime}`];

  if (normalizedMessage) {
    lines.push(`Message: ${normalizedMessage}`);
  }

  return lines.join('\n');
}

function buildDirectionsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function BrandMark({
  accentColor,
  dealershipName,
  logoUrl,
}: {
  accentColor: string;
  dealershipName: string;
  logoUrl: string | null;
}) {
  if (logoUrl) {
    return (
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          overflow: 'hidden',
          background: '#ffffff',
          border: `1px solid ${hexToRgba(accentColor, 0.12)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          alt={dealershipName}
          src={logoUrl}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>
    );
  }

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
          stroke={accentColor}
          strokeWidth="3.5"
          width="36"
          x="14"
          y="10"
        />
        <path
          d="M23 18c0 13 2.7 24 9 24 6.3 0 9-11 9-24"
          stroke={accentColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4.5"
        />
        <path d="M23 31h18" stroke={accentColor} strokeLinecap="round" strokeWidth="4.5" />
      </svg>
    </div>
  );
}

function AdvisorAvatar({
  avatarUrl,
  salespersonName,
}: {
  avatarUrl: string | null;
  salespersonName: string;
}) {
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 999,
        flexShrink: 0,
        padding: 2,
        background: 'linear-gradient(180deg, #D3AF63 0%, #B88A2D 100%)',
        boxShadow: '0 6px 16px rgba(184, 138, 45, 0.2)',
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
        {avatarUrl ? (
          <img
            alt={salespersonName}
            src={avatarUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <svg aria-hidden="true" fill="none" height="64" viewBox="0 0 68 68" width="64">
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
        )}
      </div>
    </div>
  );
}

function VehicleShowcase({
  accentColor,
  thumbnailUrl,
  vehicle,
  appointmentTime,
}: {
  accentColor: string;
  thumbnailUrl: string | null;
  vehicle: string;
  appointmentTime: string;
}) {
  return (
    <div
      style={{
        position: 'relative',
        height: 192,
        overflow: 'hidden',
        borderRadius: 22,
        background:
          'linear-gradient(180deg, rgba(229, 236, 247, 0.95) 0%, rgba(243, 246, 252, 1) 100%)',
        boxShadow: SOFT_CARD_SHADOW,
      }}
    >
      {thumbnailUrl ? (
        <img
          alt={vehicle}
          src={thumbnailUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at top right, ${hexToRgba(accentColor, 0.2)} 0%, rgba(255,255,255,0) 38%), linear-gradient(135deg, #ffffff 0%, #eef3f9 100%)`,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(9,17,33,0.02) 0%, rgba(9,17,33,0.22) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '0 auto auto 0',
          width: '62%',
          height: '100%',
          background:
            'linear-gradient(115deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 72%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.92)',
          border: `1px solid ${hexToRgba(accentColor, 0.12)}`,
          padding: '7px 11px',
          color: accentColor,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}
      >
        Personalized experience
      </div>
      <div
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          borderRadius: 16,
          background: 'rgba(17, 24, 39, 0.68)',
          backdropFilter: 'blur(12px)',
          padding: '12px 13px',
          color: '#ffffff',
          boxShadow: '0 12px 28px rgba(8, 15, 29, 0.14)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.1,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {vehicle}
        </p>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 11,
            lineHeight: 1.25,
            color: 'rgba(255,255,255,0.82)',
          }}
        >
          Your arrival details are ready for {appointmentTime}.
        </p>
      </div>
    </div>
  );
}

function InfoCard({
  accentColor,
  icon,
  label,
  title,
  detail,
  action,
}: {
  accentColor: string;
  icon: ReactNode;
  label: string;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        height: 68,
        borderRadius: 16,
        background: '#FFFFFF',
        border: `1px solid ${SOFT_BORDER}`,
        boxShadow: SOFT_CARD_SHADOW,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 14px',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          flexShrink: 0,
          background: hexToRgba(accentColor, 0.08),
          color: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: 9.5,
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: accentColor,
            fontWeight: 700,
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: '5px 0 0',
            fontSize: 14,
            lineHeight: 1.06,
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
            margin: '3px 0 0',
            fontSize: 10.5,
            lineHeight: 1.12,
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
      <path
        d="M6 1.8v4M14 1.8v4M6.5 10l2.2 2.2L13.8 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
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
      <path
        d="M6 1.8v4M14 1.8v4M9.2 12.6 13.8 8M12.2 7.9h1.6v1.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ActionButton({
  accentColor,
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  iconVariant,
}: {
  accentColor: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
  disabled?: boolean;
  iconVariant?: 'confirm' | 'reschedule' | null;
}) {
  const primary = variant === 'primary';
  const resolvedIconVariant = iconVariant ?? (primary ? 'confirm' : 'reschedule');

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type="button"
      style={{
        height: 48,
        width: '100%',
        borderRadius: 15,
        border: primary ? 'none' : `1.6px solid ${accentColor}`,
        background: primary ? accentColor : '#FFFFFF',
        color: primary ? '#FFFFFF' : accentColor,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: primary ? `0 12px 28px ${hexToRgba(accentColor, 0.24)}` : 'none',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {resolvedIconVariant ? <ButtonIcon variant={resolvedIconVariant} /> : null}
      <span>{children}</span>
    </button>
  );
}

function ActionStatusCard({
  title,
  detail,
  timestamp,
  tone,
}: {
  title: string;
  detail: string;
  timestamp: string | null;
  tone: 'success' | 'warning';
}) {
  const toneColor = tone === 'success' ? '#0f766e' : '#9a6700';
  const toneBackground = tone === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.14)';
  const toneBorder = tone === 'success' ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.18)';
  const formattedTimestamp = formatActionTimestamp(timestamp);

  return (
    <div
      style={{
        minHeight: 96,
        borderRadius: 18,
        border: `1px solid ${toneBorder}`,
        background: '#FFFFFF',
        boxShadow: SOFT_CARD_SHADOW,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 7,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 999,
            background: toneBackground,
            color: toneColor,
            padding: '6px 10px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          {title}
        </span>
        {formattedTimestamp ? (
          <span style={{ fontSize: 10.5, color: MUTED_TEXT, lineHeight: 1.1 }}>
            {formattedTimestamp}
          </span>
        ) : null}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          lineHeight: 1.35,
          color: DEEP_NAVY,
          whiteSpace: 'pre-line',
        }}
      >
        {detail}
      </p>
    </div>
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
        top: 12,
        right: 12,
        width: 30,
        height: 30,
        borderRadius: 999,
        border: `1px solid ${SOFT_BORDER}`,
        background: 'rgba(255,255,255,0.94)',
        color: MUTED_TEXT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 7px 18px rgba(17, 28, 56, 0.06)',
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
  showCloseButton = true,
  showActionButtons = true,
}: {
  initialRecord: AppointmentRecord;
  embed?: boolean;
  showCloseButton?: boolean;
  showActionButtons?: boolean;
}) {
  const [record, setRecord] = useState(initialRecord);
  const [scale, setScale] = useState(1);
  const [pendingAction, setPendingAction] = useState<'confirmed' | 'reschedule_requested' | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [preferredTime, setPreferredTime] = useState('');
  const [rescheduleMessage, setRescheduleMessage] = useState('');

  useEffect(() => {
    setRecord(initialRecord);
    setPendingAction(null);
    setActionError(null);
    setShowRescheduleForm(false);
    setPreferredTime('');
    setRescheduleMessage('');
  }, [initialRecord]);

  const cardImageUrl = record.vehicleImageUrl;
  const accentColor = resolveAccentColor(record.dealershipBrandColor);

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
    if (embed || record.viewedAt) {
      return;
    }

    let cancelled = false;

    void fetch(`/api/appointments/${encodeURIComponent(record.id)}/status`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'viewed',
      }),
    })
      .then(async (response) => {
        if (!response.ok || cancelled) {
          return null;
        }

        return (await response.json()) as { record?: AppointmentRecord | null };
      })
      .then((payload) => {
        if (cancelled || !payload?.record) {
          return;
        }

        setRecord(payload.record);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [embed, record.id, record.viewedAt]);

  async function handleStatusAction(
    action: 'confirmed' | 'reschedule_requested',
    options: {
      rescheduleNote?: string | null;
    } = {},
  ) {
    if (embed || !showActionButtons || pendingAction) {
      return;
    }

    setActionError(null);
    setPendingAction(action);

    try {
      const response = await fetch(`/api/appointments/${encodeURIComponent(record.id)}/status`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action,
          rescheduleNote: options.rescheduleNote ?? null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setActionError(payload?.error ?? 'Unable to save your response right now.');
        return;
      }

      const payload = (await response.json()) as { record?: AppointmentRecord | null };

      if (payload.record) {
        setRecord(payload.record);
        setShowRescheduleForm(false);
        setPreferredTime('');
        setRescheduleMessage('');
      }
    } catch {
      setActionError('Unable to save your response right now.');
    } finally {
      setPendingAction(null);
    }
  }

  const hasConfirmed = Boolean(record.confirmedAt);
  const hasRescheduleRequest = Boolean(record.rescheduleRequestedAt);

  function handleRescheduleSubmit() {
    if (!preferredTime.trim()) {
      setActionError('Add a preferred time before sending a reschedule request.');
      return;
    }

    void handleStatusAction('reschedule_requested', {
      rescheduleNote: buildRescheduleRequestNote(preferredTime, rescheduleMessage),
    });
  }

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
            borderRadius: 28,
            overflow: 'hidden',
            background: CARD_BACKGROUND,
            boxShadow: SOFT_SHADOW,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: '0 0 auto 0',
              height: 4,
              background: `linear-gradient(90deg, ${accentColor} 0%, ${hexToRgba(accentColor, 0.55)} 100%)`,
            }}
          />
          {showCloseButton ? <CloseButton embed={embed} /> : null}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              paddingTop: 1,
              paddingRight: showCloseButton ? 38 : 0,
            }}
          >
            <BrandMark
              accentColor={accentColor}
              dealershipName={record.dealershipName}
              logoUrl={record.dealershipLogoUrl}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: 3,
                minWidth: 0,
                flex: 1,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 17,
                  lineHeight: 1.02,
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
              <span style={{ fontSize: 10, color: MUTED_TEXT, lineHeight: 1 }}>
                Personalized appointment details
              </span>
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              padding: '1px 4px 0',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: SERIF_FAMILY,
                fontSize: 31,
                lineHeight: 0.96,
                fontWeight: 700,
                letterSpacing: '-0.05em',
                color: DEEP_NAVY,
              }}
            >
              <span style={{ color: accentColor }}>{record.firstName}, </span>
              your appointment card is ready.
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 11.5,
                lineHeight: 1.25,
                color: MUTED_TEXT,
              }}
            >
              We can&apos;t wait to show you everything in person.
            </p>
          </div>

          <VehicleShowcase
            accentColor={accentColor}
            thumbnailUrl={cardImageUrl}
            vehicle={record.vehicle}
            appointmentTime={record.appointmentTime}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minHeight: 64,
              padding: '1px 2px 0',
            }}
          >
            <AdvisorAvatar
              avatarUrl={record.salespersonAvatarUrl}
              salespersonName={record.salespersonName}
            />
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
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
                  fontSize: 9.5,
                  lineHeight: 1.15,
                  color: MUTED_TEXT,
                }}
              >
                {record.salespersonTitle || 'Your Sales Advisor'}
              </p>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: 9.5,
                  lineHeight: 1.18,
                  color: DEEP_NAVY,
                }}
              >
                Your vehicle details and arrival time are already set for your visit.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <InfoCard
              accentColor={accentColor}
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
              accentColor={accentColor}
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
              accentColor={accentColor}
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
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    flexShrink: 0,
                    border: `1px solid rgba(23, 35, 65, 0.18)`,
                    background: '#FFFFFF',
                    color: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg
                    aria-hidden="true"
                    fill="currentColor"
                    height="16"
                    viewBox="0 0 20 20"
                    width="16"
                  >
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

          {showActionButtons ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hasConfirmed ? (
                <ActionStatusCard
                  detail="Your confirmation has been saved for the dealership."
                  timestamp={record.confirmedAt}
                  title="Appointment Confirmed"
                  tone="success"
                />
              ) : hasRescheduleRequest ? (
                <ActionStatusCard
                  detail={
                    record.rescheduleNote || 'Your dealership will follow up with a new time.'
                  }
                  timestamp={record.rescheduleRequestedAt}
                  title="Reschedule Requested"
                  tone="warning"
                />
              ) : showRescheduleForm ? (
                <div
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${hexToRgba(accentColor, 0.14)}`,
                    background: '#FFFFFF',
                    boxShadow: SOFT_CARD_SHADOW,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 9,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.2,
                        color: DEEP_NAVY,
                      }}
                    >
                      Request a new time
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 10.5,
                        lineHeight: 1.25,
                        color: MUTED_TEXT,
                      }}
                    >
                      Share your preferred time and anything the dealership should know.
                    </p>
                  </div>
                  <input
                    onChange={(event) => {
                      setPreferredTime(event.target.value);
                      setActionError(null);
                    }}
                    placeholder="Preferred time"
                    style={{
                      height: 38,
                      borderRadius: 12,
                      border: `1px solid ${hexToRgba(accentColor, 0.18)}`,
                      padding: '0 12px',
                      fontSize: 12,
                      color: DEEP_NAVY,
                      outline: 'none',
                    }}
                    type="text"
                    value={preferredTime}
                  />
                  <textarea
                    onChange={(event) => {
                      setRescheduleMessage(event.target.value);
                      setActionError(null);
                    }}
                    placeholder="Optional message"
                    rows={2}
                    style={{
                      resize: 'none',
                      borderRadius: 12,
                      border: `1px solid ${hexToRgba(accentColor, 0.18)}`,
                      padding: '10px 12px',
                      fontSize: 12,
                      lineHeight: 1.35,
                      color: DEEP_NAVY,
                      outline: 'none',
                    }}
                    value={rescheduleMessage}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                    <ActionButton
                      accentColor={accentColor}
                      disabled={pendingAction === 'reschedule_requested'}
                      onClick={handleRescheduleSubmit}
                    >
                      {pendingAction === 'reschedule_requested' ? 'Sending...' : 'Send Request'}
                    </ActionButton>
                    <ActionButton
                      accentColor={accentColor}
                      disabled={pendingAction === 'reschedule_requested'}
                      iconVariant={null}
                      onClick={() => {
                        setShowRescheduleForm(false);
                        setActionError(null);
                      }}
                      variant="secondary"
                    >
                      Back
                    </ActionButton>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  <ActionButton
                    accentColor={accentColor}
                    disabled={pendingAction !== null}
                    onClick={() => void handleStatusAction('confirmed')}
                  >
                    {pendingAction === 'confirmed' ? 'Saving...' : 'Confirm Appointment'}
                  </ActionButton>
                  <ActionButton
                    accentColor={accentColor}
                    disabled={pendingAction !== null}
                    onClick={() => {
                      setActionError(null);
                      setShowRescheduleForm(true);
                    }}
                    variant="secondary"
                  >
                    Reschedule
                  </ActionButton>
                </div>
              )}
              {actionError ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 10.5,
                    lineHeight: 1.25,
                    color: '#b42318',
                    textAlign: 'center',
                  }}
                >
                  {actionError}
                </p>
              ) : null}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              color: MUTED_TEXT,
              fontSize: 9.5,
              lineHeight: 1,
              paddingTop: 0,
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LockIcon />
              <span>Secure appointment details for your visit.</span>
            </div>
            <span style={{ color: accentColor, fontWeight: 700 }}>{record.appointmentTime}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
