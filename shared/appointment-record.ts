import {
  buildSmsText,
  generateAppointmentId,
  isStandardAppointmentId,
  normalizeAppointmentId,
  type AppointmentDraft,
  type AppointmentRecord,
  type NormalizedAppointmentRow,
  type VehicleImageProvider,
  type VehicleImageSelection,
} from './repple-contract';
import { type AppointmentVideoStatus } from './heygen';
import type { AppointmentRow, AppointmentStatus, PublicAppointmentRow } from './supabase-schema';

type BaseAppointmentRecord = AppointmentRecord;

type AppointmentUrlBuilders = {
  buildPublicLandingPageUrl: (id: string) => string;
  buildPreviewImageUrl: (id: string) => string;
};

type AppointmentDefaults = {
  dealershipName?: string;
  dealershipLogoUrl?: string | null;
  dealershipBrandColor?: string | null;
  dealershipAddress?: string;
  salespersonTitle?: string | null;
  salespersonAvatarUrl?: string | null;
  smsTemplate?: string | null;
  organizationId?: string | null;
  createdByProfileId?: string | null;
};

type CreateAppointmentRecordOptions = {
  id?: string;
  vehicleImage?: VehicleImageSelection | null;
  createdAt?: string;
  defaults?: AppointmentDefaults;
};

function finalizeAppointmentRecord(
  baseRecord: BaseAppointmentRecord,
  smsTemplate?: string | null,
) {
  return {
    ...baseRecord,
    smsText: buildSmsText(baseRecord, smsTemplate),
  };
}

function deriveLegacyStatus(input: {
  viewedAt: string | null;
  confirmedAt: string | null;
  rescheduleRequestedAt: string | null;
}): AppointmentStatus {
  if (input.confirmedAt) {
    return 'confirmed';
  }

  if (input.rescheduleRequestedAt) {
    return 'reschedule_requested';
  }

  if (input.viewedAt) {
    return 'opened';
  }

  return 'generated';
}

function normalizeVehicleImageProvider(
  value: string | null | undefined,
): VehicleImageProvider | null {
  switch (value) {
    case 'crm-page':
    case 'inventory-page':
    case 'vin-lookup':
    case 'external-api':
    case 'fallback':
      return value;
    default:
      return null;
  }
}

function normalizeVideoStatus(value: string | null | undefined): AppointmentVideoStatus {
  switch (value) {
    case 'queued':
    case 'processing':
    case 'completed':
    case 'failed':
    case 'disabled':
      return value;
    default:
      return 'not_requested';
  }
}

export function createSharedAppointmentRecord(
  draft: AppointmentDraft,
  urls: AppointmentUrlBuilders,
  options: CreateAppointmentRecordOptions = {},
): AppointmentRecord {
  const id = normalizeAppointmentId(options.id ?? generateAppointmentId());

  if (!isStandardAppointmentId(id)) {
    throw new Error('Unable to generate a valid public appointment ID.');
  }

  return finalizeAppointmentRecord({
    id,
    appointmentId: null,
    organizationId: options.defaults?.organizationId ?? null,
    createdByProfileId: options.defaults?.createdByProfileId ?? null,
    firstName: draft.firstName.trim(),
    vehicle: draft.vehicle.trim(),
    appointmentTime: draft.appointmentTime.trim(),
    salespersonName: draft.salespersonName.trim(),
    salespersonTitle: options.defaults?.salespersonTitle ?? null,
    salespersonAvatarUrl: options.defaults?.salespersonAvatarUrl ?? null,
    dealershipName: draft.dealershipName.trim() || options.defaults?.dealershipName || '',
    dealershipLogoUrl: options.defaults?.dealershipLogoUrl ?? null,
    dealershipBrandColor: options.defaults?.dealershipBrandColor ?? null,
    dealershipAddress:
      draft.dealershipAddress.trim() || options.defaults?.dealershipAddress || '',
    landingPageUrl: urls.buildPublicLandingPageUrl(id),
    previewImageUrl: urls.buildPreviewImageUrl(id),
    vehicleImageUrl: options.vehicleImage?.url ?? null,
    vehicleImageProvider: options.vehicleImage?.provider ?? null,
    vehicleImageSourcePageUrl: options.vehicleImage?.sourcePageUrl ?? null,
    vehicleImageConfidence: options.vehicleImage?.confidence ?? null,
    videoStatus: 'not_requested',
    videoUrl: null,
    videoThumbnailUrl: null,
    videoSharePageUrl: null,
    videoRequestedAt: null,
    videoCompletedAt: null,
    videoError: null,
    smsText: '',
    viewedAt: null,
    confirmedAt: null,
    rescheduleRequestedAt: null,
    rescheduleNote: null,
    status: 'generated',
    createdAt: options.createdAt ?? new Date().toISOString(),
  }, options.defaults?.smsTemplate);
}

export function hydrateSharedAppointmentRecord(
  row: NormalizedAppointmentRow,
  urls: AppointmentUrlBuilders,
): AppointmentRecord {
  return finalizeAppointmentRecord({
    id: row.generated_id,
    appointmentId: null,
    organizationId: null,
    createdByProfileId: null,
    firstName: row.customer_name.trim(),
    vehicle: row.vehicle.trim(),
    appointmentTime: row.appointment_time.trim(),
    salespersonName: row.salesperson_name.trim(),
    salespersonTitle: null,
    salespersonAvatarUrl: null,
    dealershipName: row.dealership_name.trim(),
    dealershipLogoUrl: null,
    dealershipBrandColor: null,
    dealershipAddress: row.address.trim(),
    landingPageUrl: urls.buildPublicLandingPageUrl(row.generated_id),
    previewImageUrl: urls.buildPreviewImageUrl(row.generated_id),
    vehicleImageUrl: row.vehicle_image_url,
    vehicleImageProvider: row.vehicle_image_provider,
    vehicleImageSourcePageUrl: row.vehicle_image_source_page_url,
    vehicleImageConfidence: row.vehicle_image_confidence,
    videoStatus: row.video_status,
    videoUrl: row.video_url,
    videoThumbnailUrl: row.video_thumbnail_url,
    videoSharePageUrl: row.video_share_page_url,
    videoRequestedAt: row.video_requested_at,
    videoCompletedAt: row.video_completed_at,
    videoError: row.video_error,
    smsText: '',
    viewedAt: row.viewed_at,
    confirmedAt: row.confirmed_at,
    rescheduleRequestedAt: row.reschedule_requested_at,
    rescheduleNote: null,
    status: deriveLegacyStatus({
      viewedAt: row.viewed_at,
      confirmedAt: row.confirmed_at,
      rescheduleRequestedAt: row.reschedule_requested_at,
    }),
    createdAt: row.created_at,
  });
}

export function hydrateProductionAppointmentRecord(
  row: AppointmentRow | PublicAppointmentRow,
  urls: AppointmentUrlBuilders,
): AppointmentRecord {
  const appointmentId = 'id' in row ? row.id : null;
  const organizationId = 'organization_id' in row ? row.organization_id : null;
  const createdByProfileId = 'created_by_profile_id' in row ? row.created_by_profile_id : null;

  return finalizeAppointmentRecord({
    id: row.short_id,
    appointmentId,
    organizationId,
    createdByProfileId,
    firstName: row.customer_name.trim(),
    vehicle: row.vehicle.trim(),
    appointmentTime: row.appointment_time.trim(),
    salespersonName: row.salesperson_name.trim(),
    salespersonTitle: row.salesperson_title ?? null,
    salespersonAvatarUrl: row.salesperson_avatar_url ?? null,
    dealershipName: row.dealership_name.trim(),
    dealershipLogoUrl: 'dealership_logo_url' in row ? row.dealership_logo_url ?? null : null,
    dealershipBrandColor:
      'dealership_brand_color' in row ? row.dealership_brand_color ?? null : null,
    dealershipAddress: row.dealership_address.trim(),
    landingPageUrl: row.public_url || urls.buildPublicLandingPageUrl(row.short_id),
    previewImageUrl: urls.buildPreviewImageUrl(row.short_id),
    vehicleImageUrl: row.vehicle_image_url,
    vehicleImageProvider: normalizeVehicleImageProvider(row.vehicle_image_provider),
    vehicleImageSourcePageUrl: null,
    vehicleImageConfidence: null,
    videoStatus: normalizeVideoStatus(row.video_status),
    videoUrl: row.video_url ?? null,
    videoThumbnailUrl: row.video_thumbnail_url ?? null,
    videoSharePageUrl: row.video_share_page_url ?? null,
    videoRequestedAt: row.video_requested_at ?? null,
    videoCompletedAt: row.video_completed_at ?? null,
    videoError: row.video_error ?? null,
    smsText: '',
    viewedAt: row.opened_at,
    confirmedAt: row.confirmed_at,
    rescheduleRequestedAt: row.reschedule_requested_at,
    rescheduleNote: row.reschedule_note ?? null,
    status: row.status,
    createdAt: row.created_at,
  });
}
