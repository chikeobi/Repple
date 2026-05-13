import {
  hydrateSharedAppointmentRecord,
} from '../../../shared/appointment-record';
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
} from './shared/repple-contract';
import { getSiteUrl } from './env';

const SITE_URL = getSiteUrl();

export function buildPublicLandingPageUrl(id: string) {
  return buildSharedPublicLandingPageUrl(id, SITE_URL);
}

export function buildPreviewImageUrl(id: string) {
  return buildSharedPreviewImageUrl(id, SITE_URL);
}

export function hydrateAppointmentRecord(row: NonNullable<ReturnType<typeof normalizeSupabaseRow>>) {
  return hydrateSharedAppointmentRecord(row, {
    buildPublicLandingPageUrl,
    buildPreviewImageUrl,
  });
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
};
