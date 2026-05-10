export const DEALERSHIP_NAME = 'ABC Motors';
export const DEALERSHIP_ADDRESS = '1284 West Loop Drive, Houston, TX 77027';
export const STANDARD_SHORT_ID_LENGTH = 6;
export const STANDARD_SHORT_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const STANDARD_SHORT_ID_PATTERN = /^[A-Z0-9]{6}$/;
const LEGACY_SHORT_ID_PATTERN = /^rep_[a-z0-9]+$/i;

export type VideoGenerationStatus = 'processing' | 'ready';

export type AppointmentRecord = {
  id: string;
  firstName: string;
  vehicle: string;
  appointmentTime: string;
  salespersonName: string;
  dealershipName: string;
  dealershipAddress: string;
  landingPageUrl: string;
  previewImageUrl: string;
  smsText: string;
  videoProvider: 'mock';
  videoStatus: VideoGenerationStatus;
  videoJobId: string;
  videoUrl: string;
  videoThumbnailUrl: string;
  videoRequestedAt: string;
  videoReadyAt: string;
  createdAt: string;
};

export type AppointmentDraft = {
  firstName: string;
  vehicle: string;
  appointmentTime: string;
  salespersonName: string;
  dealershipName: string;
  dealershipAddress: string;
};

export type AutofillField =
  | 'firstName'
  | 'vehicle'
  | 'appointmentTime'
  | 'salespersonName'
  | 'dealershipName'
  | 'dealershipAddress';

export type AutofillConfidence = 'high' | 'medium' | 'low';

export type AutofillFieldMeta = {
  confidence: AutofillConfidence;
  matchedBy: string;
};

export type SmsDeliveryPayload = {
  body: string;
  mediaUrl: string;
  shortUrl: string;
};

export type AutofillHints = {
  firstName?: string;
  vehicle?: string;
  appointmentTime?: string;
  salespersonName?: string;
  dealershipName?: string;
  dealershipAddress?: string;
  sourceTitle?: string;
  meta?: Partial<Record<AutofillField, AutofillFieldMeta>>;
};

export type SupabaseAppointmentRow = {
  generated_id: string | null;
  legacy_generated_id?: string | null;
  customer_name: string | null;
  vehicle: string | null;
  appointment_time: string | null;
  salesperson_name: string | null;
  dealership_name: string | null;
  address: string | null;
  created_at: string | null;
};

export type NormalizedAppointmentRow = {
  generated_id: string;
  legacy_generated_id: string | null;
  customer_name: string;
  vehicle: string;
  appointment_time: string;
  salesperson_name: string;
  dealership_name: string;
  address: string;
  created_at: string;
};

export function normalizeAppointmentId(id: string) {
  const trimmed = id.trim();

  if (LEGACY_SHORT_ID_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return trimmed.toUpperCase();
}

export function isStandardAppointmentId(id: string) {
  return STANDARD_SHORT_ID_PATTERN.test(normalizeAppointmentId(id));
}

export function isLegacyAppointmentId(id: string) {
  return LEGACY_SHORT_ID_PATTERN.test(normalizeAppointmentId(id));
}

export function isSupportedAppointmentId(id: string) {
  const normalizedId = normalizeAppointmentId(id);

  return (
    STANDARD_SHORT_ID_PATTERN.test(normalizedId) || LEGACY_SHORT_ID_PATTERN.test(normalizedId)
  );
}

export function generateAppointmentId() {
  let id = '';

  for (let index = 0; index < STANDARD_SHORT_ID_LENGTH; index += 1) {
    const nextCharacter =
      STANDARD_SHORT_ID_ALPHABET[
        Math.floor(Math.random() * STANDARD_SHORT_ID_ALPHABET.length)
      ];

    id += nextCharacter;
  }

  return id;
}

export function buildPublicLandingPageUrl(id: string, origin: string) {
  const normalizedId = normalizeAppointmentId(id);

  return `${origin.replace(/\/+$/, '')}/r/${encodeURIComponent(normalizedId)}`;
}

export function buildPreviewImageUrl(id: string, origin: string) {
  const normalizedId = normalizeAppointmentId(id);

  return `${origin.replace(/\/+$/, '')}/r/${encodeURIComponent(normalizedId)}/preview-image`;
}

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function buildSmsLead(record: Pick<
  AppointmentRecord,
  'id' | 'vehicle' | 'appointmentTime' | 'salespersonName'
>) {
  const variants = [
    `${record.salespersonName} recorded a quick video for you before your visit ${record.appointmentTime}.`,
    `Your ${record.vehicle} is reserved and ready for ${record.appointmentTime}.`,
    `Your personalized arrival experience is ready for ${record.appointmentTime}.`,
  ];

  return variants[hashString(normalizeAppointmentId(record.id)) % variants.length];
}

export function buildSmsText(record: Pick<
  AppointmentRecord,
  | 'id'
  | 'firstName'
  | 'salespersonName'
  | 'appointmentTime'
  | 'vehicle'
  | 'landingPageUrl'
>) {
  return `Hey ${record.firstName}, ${buildSmsLead(record)} ${record.landingPageUrl}`;
}

export function buildMetaDescription(record: Pick<
  AppointmentRecord,
  'id' | 'vehicle' | 'appointmentTime' | 'salespersonName'
>) {
  return buildSmsLead(record);
}

export function buildSmsDeliveryPayload(
  record: Pick<AppointmentRecord, 'smsText' | 'previewImageUrl' | 'landingPageUrl'>,
): SmsDeliveryPayload {
  return {
    body: record.smsText,
    mediaUrl: record.previewImageUrl,
    shortUrl: record.landingPageUrl,
  };
}

export function normalizeSupabaseRow(row: SupabaseAppointmentRow | null | undefined) {
  if (
    !row?.generated_id ||
    !row.customer_name ||
    !row.vehicle ||
    !row.appointment_time ||
    !row.salesperson_name ||
    !row.dealership_name ||
    !row.address ||
    !row.created_at
  ) {
    return null;
  }

  const normalizedGeneratedId = normalizeAppointmentId(row.generated_id);
  const normalizedLegacyId = row.legacy_generated_id
    ? normalizeAppointmentId(row.legacy_generated_id)
    : null;

  if (!isSupportedAppointmentId(normalizedGeneratedId)) {
    return null;
  }

  if (normalizedLegacyId && !isLegacyAppointmentId(normalizedLegacyId)) {
    return null;
  }

  return {
    generated_id: normalizedGeneratedId,
    legacy_generated_id: normalizedLegacyId,
    customer_name: row.customer_name,
    vehicle: row.vehicle,
    appointment_time: row.appointment_time,
    salesperson_name: row.salesperson_name,
    dealership_name: row.dealership_name,
    address: row.address,
    created_at: row.created_at,
  };
}
