import {
  DEALERSHIP_ADDRESS,
  DEALERSHIP_NAME,
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
import {
  appendVinToVehicleImageUrl as appendSharedVinToVehicleImageUrl,
  buildVehicleImageRenderUrl as buildSharedVehicleImageRenderUrl,
  buildVehicleImageResolveUrl as buildSharedVehicleImageResolveUrl,
} from '../shared/vehicle-images';
import { startMockVideoGeneration } from './video-generation';
import type { VehicleImageSelection } from '../shared/repple-contract';

const PUBLIC_APP_FALLBACK_ORIGIN = 'https://repple.ai';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function getConfiguredPublicAppOrigin() {
  const configuredOrigin = import.meta.env.WXT_PUBLIC_APP_URL?.trim();

  if (!configuredOrigin) {
    return PUBLIC_APP_FALLBACK_ORIGIN;
  }

  return trimTrailingSlash(configuredOrigin);
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
  options?: { id?: string; vehicleImage?: VehicleImageSelection | null },
): AppointmentRecord {
  const id = normalizeAppointmentId(options?.id ?? generateAppointmentId());

  if (!isStandardAppointmentId(id)) {
    throw new Error('Unable to generate a valid public appointment ID.');
  }

  const landingPageUrl = buildPublicLandingPageUrl(id);

  const baseRecord = {
    id,
    firstName: draft.firstName.trim(),
    vehicle: draft.vehicle.trim(),
    appointmentTime: draft.appointmentTime.trim(),
    salespersonName: draft.salespersonName.trim(),
    dealershipName: draft.dealershipName.trim() || DEALERSHIP_NAME,
    dealershipAddress: draft.dealershipAddress.trim() || DEALERSHIP_ADDRESS,
    landingPageUrl,
    previewImageUrl: buildPreviewImageUrl(id),
    vehicleImageUrl: options?.vehicleImage?.url ?? null,
    vehicleImageProvider: options?.vehicleImage?.provider ?? null,
    vehicleImageSourcePageUrl: options?.vehicleImage?.sourcePageUrl ?? null,
    vehicleImageConfidence: options?.vehicleImage?.confidence ?? null,
    smsText: '',
    createdAt: new Date().toISOString(),
  };

  const record = startMockVideoGeneration(baseRecord);

  return {
    ...record,
    smsText: buildSmsText(record),
  };
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
