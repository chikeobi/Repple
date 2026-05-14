import type { FormEventHandler, RefObject } from 'react';

import { AppointmentCard } from '../../../components/AppointmentCard';
import { Button } from '../../../components/Button';
import { FormField } from '../../../components/FormField';
import { getAppointmentStatusSummary } from '../../../shared/appointment-status';
import {
  formatOrganizationSubscriptionStatus,
} from '../../../shared/billing';
import type {
  AppointmentDraft,
  AppointmentRecord,
} from '../../../utils/types';

type DraftKey = keyof AppointmentDraft;

function formatActivityTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently generated';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function CreateWorkspaceTab({
  billingStatus,
  canGenerate,
  copyLabel,
  draft,
  error,
  generated,
  hasActiveBilling,
  isGenerating,
  onCopySms,
  onFieldChange,
  onGenerate,
  onOpenLandingPage,
  previewRecord,
  resultRef,
  smsDraft,
  onSmsDraftChange,
}: {
  billingStatus: string | null | undefined;
  canGenerate: boolean;
  copyLabel: string;
  draft: AppointmentDraft;
  error: string;
  generated: AppointmentRecord | null;
  hasActiveBilling: boolean;
  isGenerating: boolean;
  onCopySms: () => void;
  onFieldChange: (key: DraftKey, value: string) => void;
  onGenerate: FormEventHandler<HTMLFormElement>;
  onOpenLandingPage: (record?: AppointmentRecord | null) => void;
  previewRecord: AppointmentRecord;
  resultRef: RefObject<HTMLDivElement | null>;
  smsDraft: string;
  onSmsDraftChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {!hasActiveBilling ? (
        <div className="rounded-[18px] border border-[rgba(245,158,11,0.16)] bg-[rgba(245,158,11,0.09)] px-4 py-3 text-sm leading-6 text-[#9a6700]">
          Billing is currently {formatOrganizationSubscriptionStatus(billingStatus).toLowerCase()} for this dealership. An owner or admin needs to activate billing in the web app before reps can generate cards.
        </div>
      ) : null}

      <form className="space-y-3.5" onSubmit={onGenerate}>
        <div className="space-y-3.5 rounded-[18px] bg-[rgba(255,255,255,0.52)] p-1">
          <FormField
            label="Customer First Name"
            onChange={(event) => onFieldChange('firstName', event.target.value)}
            placeholder="John"
            value={draft.firstName}
          />
          <FormField
            label="Vehicle"
            onChange={(event) => onFieldChange('vehicle', event.target.value)}
            placeholder="2024 Honda Accord"
            value={draft.vehicle}
          />
          <FormField
            label="Appointment Time"
            onChange={(event) => onFieldChange('appointmentTime', event.target.value)}
            placeholder="tomorrow at 3 PM"
            value={draft.appointmentTime}
          />
          <FormField
            label="Salesperson Name"
            onChange={(event) => onFieldChange('salespersonName', event.target.value)}
            placeholder="Mike"
            value={draft.salespersonName}
          />
          <FormField
            label="Dealership Name"
            onChange={(event) => onFieldChange('dealershipName', event.target.value)}
            placeholder="Honda of Example City"
            value={draft.dealershipName}
          />
          <FormField
            label="Address"
            onChange={(event) => onFieldChange('dealershipAddress', event.target.value)}
            placeholder="1234 Main Street, Example City, ST 12345"
            value={draft.dealershipAddress}
          />
        </div>

        <Button disabled={!canGenerate || isGenerating || !hasActiveBilling} fullWidth type="submit">
          {isGenerating ? 'Publishing Repple...' : 'Generate Repple'}
        </Button>
      </form>

      <div className="space-y-3 rounded-[20px] bg-white/72 p-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--repple-muted)]">
            Live Preview
          </p>
          <p className="text-sm leading-6 text-[var(--repple-muted)]">
            The card updates as you edit the CRM details above.
          </p>
        </div>

        <div className="overflow-x-auto pb-1">
          <AppointmentCard
            embed
            initialRecord={previewRecord}
            showActionButtons={false}
            showCloseButton={false}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[rgba(239,68,68,0.14)] bg-[rgba(239,68,68,0.06)] px-4 py-3 text-sm text-[#b42318]">
          {error}
        </div>
      ) : null}

      {generated ? (
        <div className="space-y-5" ref={resultRef}>
          <div className="space-y-1">
            <p className="text-[1.55rem] font-semibold leading-none tracking-[-0.04em] text-[var(--repple-ink)]">
              {generated.firstName}&apos;s card is ready
            </p>
            <p className="text-sm leading-6 text-[var(--repple-muted)]">
              Copy the message below, then paste it into your CRM texting tool.
            </p>
          </div>

          <div className="overflow-x-auto pb-1">
            <AppointmentCard
              embed
              initialRecord={generated}
              showActionButtons={false}
              showCloseButton={false}
            />
          </div>

          <div className="space-y-2">
            <textarea
              className="min-h-32 w-full resize-none rounded-[18px] border-none bg-white/88 p-4 text-sm leading-6 text-[var(--repple-ink)] outline-none shadow-[0_14px_34px_rgba(15,23,42,0.06)]"
              onChange={(event) => onSmsDraftChange(event.target.value)}
              value={smsDraft}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={onCopySms} type="button" variant="secondary">
              {copyLabel}
            </Button>
            <Button onClick={() => onOpenLandingPage(generated)} type="button">
              View Card
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ActivityWorkspaceTab({
  isActivityLoading,
  activityRecords,
  onOpenLandingPage,
}: {
  isActivityLoading: boolean;
  activityRecords: AppointmentRecord[];
  onOpenLandingPage: (record: AppointmentRecord) => void;
}) {
  return (
    <div className="space-y-3">
      {isActivityLoading ? (
        <div className="rounded-[18px] bg-white/80 px-4 py-5 text-sm text-[var(--repple-muted)] shadow-[0_12px_26px_rgba(15,23,42,0.05)]">
          Refreshing recent cards...
        </div>
      ) : null}

      {!isActivityLoading && activityRecords.length === 0 ? (
        <div className="rounded-[18px] bg-white/82 px-4 py-5 text-sm text-[var(--repple-muted)] shadow-[0_12px_26px_rgba(15,23,42,0.05)]">
          Generated Repple cards will appear here.
        </div>
      ) : null}

      {activityRecords.map((record) => (
        (() => {
          const latestStatus = getAppointmentStatusSummary(record);

          return (
            <button
              className="w-full rounded-[18px] bg-white/92 px-4 py-4 text-left shadow-[0_14px_32px_rgba(15,23,42,0.06)] transition hover:bg-white"
              key={record.id}
              onClick={() => onOpenLandingPage(record)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold leading-5 text-[var(--repple-ink)]">
                    {record.firstName}
                  </p>
                  <p className="mt-1 truncate text-[13px] leading-5 text-[var(--repple-muted)]">
                    {record.vehicle}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--repple-muted)]">
                    Generated {formatActivityTimestamp(record.createdAt)}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--repple-muted)]">
                    Latest: {latestStatus.label} {formatActivityTimestamp(latestStatus.occurredAt)}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium leading-4 text-[var(--repple-accent-deep)]">
                  View Card
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    record.viewedAt
                      ? 'bg-[rgba(10,132,255,0.12)] text-[var(--repple-accent-deep)]'
                      : 'bg-[rgba(15,23,42,0.06)] text-[var(--repple-muted)]'
                  }`}
                >
                  {record.viewedAt ? 'Viewed' : 'Not Viewed'}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    record.confirmedAt
                      ? 'bg-[rgba(16,185,129,0.12)] text-[#0f766e]'
                      : 'bg-[rgba(15,23,42,0.06)] text-[var(--repple-muted)]'
                  }`}
                >
                  {record.confirmedAt ? 'Confirmed' : 'Not Confirmed'}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    record.rescheduleRequestedAt
                      ? 'bg-[rgba(245,158,11,0.14)] text-[#9a6700]'
                      : 'bg-[rgba(15,23,42,0.06)] text-[var(--repple-muted)]'
                  }`}
                >
                  {record.rescheduleRequestedAt ? 'Reschedule Requested' : 'No Reschedule'}
                </span>
              </div>
            </button>
          );
        })()
      ))}
    </div>
  );
}
