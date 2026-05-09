import { useEffect, useState, type ReactNode } from 'react';

import {
  DEALERSHIP_ADDRESS,
  buildLandingPageUrl,
  getAppointmentIdFromSearch,
} from '../../utils/repple';
import { getAppointmentRecord } from '../../utils/appointments';
import type { AppointmentRecord, VideoGenerationStatus } from '../../utils/types';

type ViewState = 'loading' | 'ready' | 'missing';
type CustomerAction = 'confirmed' | 'reschedule' | null;

const statusCopy = {
  confirmed:
    'Appointment confirmed. In the full product, this would notify the salesperson instantly.',
  reschedule:
    'Reschedule request captured for the demo. In production, this would open the handoff flow.',
};

function buildDirectionsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function DealershipGlyph() {
  return (
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[14px] border border-[#D8E2F0] bg-white">
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

function PersonAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'S';

  return (
    <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full border border-[#E5EAF1] bg-[linear-gradient(180deg,#edf3fb_0%,#dfe7f2_100%)]">
      <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,#ffffff_0%,#e6edf6_72%)] text-[22px] font-semibold text-[#0f172a]">
        {initial}
      </div>
    </div>
  );
}

function DetailIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[#E5EAF1] bg-[#F8FBFF] text-[#1473FF]">
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
    <div className="flex items-center gap-4 rounded-[18px] border border-[#E5EAF1] bg-white p-4">
      <DetailIcon>{icon}</DetailIcon>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
          {label}
        </p>
        <p className="mt-1 text-[21px] font-bold leading-[1.15] text-[#0f172a]">
          {value}
        </p>
        {detail ? (
          <p className="mt-1 text-[16px] leading-[1.4] text-[#64748b]">{detail}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function VideoThumbnailCard({
  status,
  thumbnailUrl,
  onPlay,
}: {
  status: VideoGenerationStatus;
  thumbnailUrl: string;
  onPlay: () => void;
}) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-[18px] border border-[#E5EAF1] bg-[#edf3fa]">
      <img alt="" className="h-full w-full object-cover" src={thumbnailUrl} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.18)_100%)]" />

      {status === 'processing' ? (
        <div className="absolute inset-x-4 bottom-4 rounded-[16px] border border-[#E5EAF1] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#1473ff]" />
            <p className="text-[16px] font-semibold text-[#0f172a]">
              Generating personalized video...
            </p>
          </div>
          <p className="mt-1.5 text-[14px] leading-[1.45] text-[#64748b]">
            Creating a personal welcome clip for this appointment.
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E5EAF1]">
            <div className="repple-progress-bar h-full w-1/2 rounded-full bg-[#1473ff]" />
          </div>
        </div>
      ) : (
        <>
          <button
            className="absolute inset-0 flex items-center justify-center"
            onClick={onPlay}
            type="button"
          >
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[rgba(255,255,255,0.96)] shadow-[0_20px_40px_rgba(15,23,42,0.14)]">
              <svg aria-hidden="true" fill="#1473ff" height="26" viewBox="0 0 20 20" width="26">
                <path d="M7 4.5v11l8-5.5-8-5.5Z" />
              </svg>
            </span>
          </button>
          <div className="absolute bottom-4 left-4 rounded-[14px] bg-[rgba(15,23,42,0.76)] px-3 py-2 text-white">
            <p className="text-[15px] font-medium leading-none">A personal message for you</p>
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
      className={
        variant === 'primary'
          ? 'flex h-14 w-full items-center justify-center rounded-[18px] bg-[#1473ff] px-4 text-[18px] font-semibold text-white shadow-[0_12px_30px_rgba(20,115,255,0.24)]'
          : 'flex h-14 w-full items-center justify-center rounded-[18px] border border-[#1473ff] bg-white px-4 text-[18px] font-semibold text-[#1473ff]'
      }
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function LoadingShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] items-center px-4 py-4">
      <div className="w-full rounded-[24px] border border-[#E5EAF1] bg-white p-[22px] shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="space-y-[18px] text-center">{children}</div>
      </div>
    </main>
  );
}

export function LandingPage() {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [record, setRecord] = useState<AppointmentRecord | null>(null);
  const [customerAction, setCustomerAction] = useState<CustomerAction>(null);

  useEffect(() => {
    const appointmentId = getAppointmentIdFromSearch(window.location.search);

    if (!appointmentId) {
      setViewState('missing');
      return;
    }

    getAppointmentRecord(appointmentId, buildLandingPageUrl(appointmentId))
      .then((savedRecord) => {
        if (!savedRecord) {
          setViewState('missing');
          return;
        }

        document.title = `${savedRecord.firstName}'s Repple`;
        setRecord(savedRecord);
        setViewState('ready');
      })
      .catch(() => {
        setViewState('missing');
      });
  }, []);

  useEffect(() => {
    if (!record || record.videoStatus === 'ready') {
      return;
    }

    const intervalId = window.setInterval(() => {
      void getAppointmentRecord(record.id, buildLandingPageUrl(record.id))
        .then((nextRecord) => {
          if (nextRecord) {
            setRecord(nextRecord);
          }
        })
        .catch(() => {});
    }, 1200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [record]);

  if (viewState === 'loading') {
    return (
      <LoadingShell>
        <div className="mx-auto">
          <DealershipGlyph />
        </div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
          Loading appointment page
        </p>
      </LoadingShell>
    );
  }

  if (viewState !== 'ready' || !record) {
    return (
      <LoadingShell>
        <div className="mx-auto">
          <DealershipGlyph />
        </div>
        <h1 className="text-[28px] font-bold leading-tight text-[#0f172a]">
          This appointment page is not available.
        </h1>
        <p className="text-[16px] leading-[1.45] text-[#64748b]">
          The page may not have been generated yet, or the demo record has been cleared.
        </p>
      </LoadingShell>
    );
  }

  const dealershipAddress = record.dealershipAddress || DEALERSHIP_ADDRESS;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[430px] bg-[#f5f8fc] px-4 py-4">
      <div className="rounded-[24px] border border-[#E5EAF1] bg-white p-[22px] shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="space-y-[18px]">
          <div className="space-y-2 text-center">
            <DealershipGlyph />
            <div className="space-y-1">
              <p className="text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">
                {record.dealershipName}
              </p>
              <p className="text-[16px] leading-[1.35] text-[#64748b]">
                Real People. Real Service.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.04em] text-[#0f172a]">
              <span className="text-[#1473ff]">{record.firstName},</span> your vehicle is
              reserved.
            </h1>
            <p className="text-[16px] leading-[1.45] text-[#64748b]">
              We can&apos;t wait to show you everything in person.
            </p>
          </div>

          <VideoThumbnailCard
            onPlay={() => window.open(record.videoUrl, '_blank', 'noopener,noreferrer')}
            status={record.videoStatus}
            thumbnailUrl={record.videoThumbnailUrl}
          />

          <div className="flex items-center gap-4 rounded-[18px] border border-[#E5EAF1] bg-white p-4">
            <PersonAvatar name={record.salespersonName} />
            <div className="min-w-0">
              <p className="text-[21px] font-bold leading-[1.15] text-[#0f172a]">
                {record.salespersonName}
              </p>
              <p className="mt-1 text-[16px] leading-[1.35] text-[#64748b]">
                Your Sales Advisor
              </p>
              <p className="mt-1.5 text-[16px] leading-[1.45] text-[#0f172a]">
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
            detail={dealershipAddress}
            action={
              <button
                aria-label="Open maps"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5EAF1] bg-[#F8FBFF] text-[#1473ff]"
                onClick={() =>
                  window.open(
                    buildDirectionsUrl(dealershipAddress),
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
                type="button"
              >
                <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 20 20" width="18">
                  <path d="M16.8 3.6 3.8 8.5c-.7.2-.7 1.2 0 1.4l4.8 1.5 1.5 4.8c.2.7 1.2.7 1.4 0l4.9-13c.2-.6-.4-1.1-1-.9Z" />
                </svg>
              </button>
            }
          />

          <div className="space-y-3">
            {customerAction ? (
              <div className="rounded-[18px] border border-[#DCE8FB] bg-[#F5F9FF] px-4 py-3 text-[14px] leading-[1.45] text-[#0f172a]">
                {statusCopy[customerAction]}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <ActionButton onClick={() => setCustomerAction('confirmed')}>
                Confirm
              </ActionButton>
              <ActionButton
                onClick={() => setCustomerAction('reschedule')}
                variant="secondary"
              >
                Reschedule
              </ActionButton>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[#E5EAF1] pt-[18px] text-[13px] text-[#64748b]">
            <div className="inline-flex items-center gap-2">
              <FooterLock />
              <span>Secure. Private. Just for you.</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <span>Powered by</span>
              <span className="font-semibold text-[#0f172a]">Repple</span>
              <span className="text-[#1473ff]">
                <FooterSmile />
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
