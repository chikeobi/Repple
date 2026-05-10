import {
  buildMetaDescription,
  buildPreviewImageUrl as buildSharedPreviewImageUrl,
  buildPublicLandingPageUrl as buildSharedPublicLandingPageUrl,
  buildSmsText,
  isLegacyAppointmentId,
  isStandardAppointmentId,
  isSupportedAppointmentId,
  normalizeAppointmentId,
  normalizeSupabaseRow,
  type AppointmentRecord,
  type SupabaseAppointmentRow,
  type VideoGenerationStatus,
} from './shared/repple-contract';
import { hydrateMockVideoGeneration } from './shared/mock-video';
import { getSiteUrl } from './env';

const SITE_URL = getSiteUrl();

export function buildPublicLandingPageUrl(id: string) {
  return buildSharedPublicLandingPageUrl(id, SITE_URL);
}

export function buildPreviewImageUrl(id: string) {
  return buildSharedPreviewImageUrl(id, SITE_URL);
}

export function hydrateAppointmentRecord(row: NonNullable<ReturnType<typeof normalizeSupabaseRow>>) {
  const baseRecord = {
    id: row.generated_id,
    firstName: row.customer_name.trim(),
    vehicle: row.vehicle.trim(),
    appointmentTime: row.appointment_time.trim(),
    salespersonName: row.salesperson_name.trim(),
    dealershipName: row.dealership_name.trim(),
    dealershipAddress: row.address.trim(),
    landingPageUrl: buildPublicLandingPageUrl(row.generated_id),
    previewImageUrl: buildPreviewImageUrl(row.generated_id),
    vehicleImageUrl: row.vehicle_image_url,
    vehicleImageProvider: row.vehicle_image_provider,
    vehicleImageSourcePageUrl: row.vehicle_image_source_page_url,
    vehicleImageConfidence: row.vehicle_image_confidence,
    smsText: '',
    createdAt: row.created_at,
  };

  const hydratedRecord = hydrateMockVideoGeneration(baseRecord);

  return {
    ...hydratedRecord,
    smsText: buildSmsText(hydratedRecord),
  };
}

export {
  buildMetaDescription,
  buildSmsText,
  isLegacyAppointmentId,
  isStandardAppointmentId,
  isSupportedAppointmentId,
  normalizeAppointmentId,
  normalizeSupabaseRow,
  type AppointmentRecord,
  type SupabaseAppointmentRow,
  type VideoGenerationStatus,
};
