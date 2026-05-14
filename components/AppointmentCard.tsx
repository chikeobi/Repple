'use client';

import { useEffect, useState } from 'react';

import type { AppointmentRecord } from '../shared/repple-contract';
import {
  AppointmentActionSection,
  AppointmentBrandMark,
  AdvisorAvatar,
  buildDirectionsUrl,
  buildRescheduleRequestNote,
  CARD_BACKGROUND,
  CARD_HEIGHT,
  CARD_WIDTH,
  CloseButton,
  DEEP_NAVY,
  hexToRgba,
  InfoCard,
  LockIcon,
  MUTED_TEXT,
  PAGE_BACKGROUND,
  resolveAccentColor,
  SERIF_FAMILY,
  SOFT_SHADOW,
  VehicleShowcase,
} from './appointment-card/ui';

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
            <AppointmentBrandMark
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
            appointmentTime={record.appointmentTime}
            thumbnailUrl={record.vehicleImageUrl}
            videoStatus={record.videoStatus}
            videoThumbnailUrl={record.videoThumbnailUrl}
            videoUrl={record.videoUrl}
            vehicle={record.vehicle}
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
              detail="Prepared and waiting for you"
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
            />
            <InfoCard
              accentColor={accentColor}
              detail="Reserved time just for you"
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
                    border: '1px solid rgba(23, 35, 65, 0.18)',
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

          <AppointmentActionSection
            accentColor={accentColor}
            actionError={actionError}
            hasConfirmed={Boolean(record.confirmedAt)}
            hasRescheduleRequest={Boolean(record.rescheduleRequestedAt)}
            onConfirm={() => void handleStatusAction('confirmed')}
            onRescheduleSubmit={handleRescheduleSubmit}
            pendingAction={pendingAction}
            preferredTime={preferredTime}
            record={record}
            rescheduleMessage={rescheduleMessage}
            setActionError={setActionError}
            setPreferredTime={setPreferredTime}
            setRescheduleMessage={setRescheduleMessage}
            setShowRescheduleForm={setShowRescheduleForm}
            showActionButtons={showActionButtons}
            showRescheduleForm={showRescheduleForm}
          />

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
