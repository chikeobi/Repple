import type { AppointmentRecord } from './repple-contract';

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function getLatestAppointmentActivityTimestamp(record: AppointmentRecord) {
  return Math.max(
    toTimestamp(record.rescheduleRequestedAt),
    toTimestamp(record.confirmedAt),
    toTimestamp(record.viewedAt),
    toTimestamp(record.createdAt),
  );
}

export function sortAppointmentsByLatestActivity<T extends AppointmentRecord>(records: T[]) {
  return [...records].sort(
    (left, right) =>
      getLatestAppointmentActivityTimestamp(right) - getLatestAppointmentActivityTimestamp(left),
  );
}

export function getAppointmentStatusSummary(record: AppointmentRecord) {
  if (record.rescheduleRequestedAt) {
    return {
      label: 'Reschedule requested',
      occurredAt: record.rescheduleRequestedAt,
      tone: 'warning' as const,
    };
  }

  if (record.confirmedAt) {
    return {
      label: 'Confirmed',
      occurredAt: record.confirmedAt,
      tone: 'success' as const,
    };
  }

  if (record.viewedAt) {
    return {
      label: 'Viewed',
      occurredAt: record.viewedAt,
      tone: 'info' as const,
    };
  }

  return {
    label: 'Generated',
    occurredAt: record.createdAt,
    tone: 'neutral' as const,
  };
}
