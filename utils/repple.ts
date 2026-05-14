import {
  buildMetaDescription,
  buildPreviewImageUrl as buildSharedPreviewImageUrl,
  buildPublicLandingPageUrl as buildSharedPublicLandingPageUrl,
  buildSmsDeliveryPayload,
  buildSmsText,
  generateAppointmentId,
  isLegacyAppointmentId,
  isStandardAppointmentId,
  isSupportedAppointmentId,
  normalizeAppointmentId,
  type AppointmentDraft,
  type AppointmentRecord,
} from '../shared/repple-contract';
import { createSharedAppointmentRecord } from '../shared/appointment-record';
import {
  appendVinToVehicleImageUrl as appendSharedVinToVehicleImageUrl,
  buildVehicleImageRenderUrl as buildSharedVehicleImageRenderUrl,
  buildVehicleImageResolveUrl as buildSharedVehicleImageResolveUrl,
} from '../shared/vehicle-images';
import type { VehicleImageSelection } from '../shared/repple-contract';

const PUBLIC_APP_FALLBACK_ORIGIN = 'https://repple.ai';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function getConfiguredPublicAppOrigin() {
  const configuredOrigin =
    import.meta.env.WXT_PUBLIC_APP_URL?.trim() ||
    import.meta.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    import.meta.env.WXT_SITE_URL?.trim();

  if (!configuredOrigin) {
    return PUBLIC_APP_FALLBACK_ORIGIN;
  }

  try {
    return new URL(configuredOrigin).origin;
  } catch {
    return PUBLIC_APP_FALLBACK_ORIGIN;
  }
}

export function buildPublicLandingPageUrl(id: string, origin = getConfiguredPublicAppOrigin()) {
  return buildSharedPublicLandingPageUrl(id, origin);
}

export function buildPreviewImageUrl(id: string, origin = getConfiguredPublicAppOrigin()) {
  return buildSharedPreviewImageUrl(id, origin);
}

export function buildVehicleImageRenderUrl(
  vehicle: string,
  origin = getConfiguredPublicAppOrigin(),
) {
  return buildSharedVehicleImageRenderUrl(vehicle, origin);
}

export function buildVehicleImageResolveUrl(
  vehicle: string,
  origin = getConfiguredPublicAppOrigin(),
) {
  return buildSharedVehicleImageResolveUrl(vehicle, origin);
}

export function appendVinToVehicleImageResolveUrl(url: string, vin?: string | null) {
  return appendSharedVinToVehicleImageUrl(url, vin);
}

export function buildLandingPageUrl(id: string) {
  return buildPublicLandingPageUrl(id);
}

export function createAppointmentRecord(
  draft: AppointmentDraft,
  options?: {
    id?: string;
    vehicleImage?: VehicleImageSelection | null;
    smsTemplate?: string | null;
    dealershipLogoUrl?: string | null;
    dealershipBrandColor?: string | null;
  },
): AppointmentRecord {
  return createSharedAppointmentRecord(
    draft,
    {
      buildPublicLandingPageUrl,
      buildPreviewImageUrl,
    },
    {
      id: options?.id,
      vehicleImage: options?.vehicleImage ?? null,
      defaults: {
        smsTemplate: options?.smsTemplate ?? null,
        dealershipLogoUrl: options?.dealershipLogoUrl ?? null,
        dealershipBrandColor: options?.dealershipBrandColor ?? null,
      },
    },
  );
}

export function getAppointmentIdFromSearch(search: string) {
  return new URLSearchParams(search).get('id')?.trim() ?? '';
}

export {
  buildMetaDescription,
  buildSmsDeliveryPayload,
  buildSmsText,
  generateAppointmentId,
  isLegacyAppointmentId,
  isStandardAppointmentId,
  isSupportedAppointmentId,
  normalizeAppointmentId,
};
