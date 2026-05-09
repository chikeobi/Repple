import { browser } from 'wxt/browser';

import type { AppointmentDraft, AppointmentRecord, SmsDeliveryPayload } from './types';
import { startMockVideoGeneration } from './video-generation';

export const DEALERSHIP_NAME = 'ABC Motors';
export const DEALERSHIP_ADDRESS = '1284 West Loop Drive, Houston, TX 77027';
const PUBLIC_APP_FALLBACK_ORIGIN = 'https://repple.ai';
const SHORT_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SHORT_ID_LENGTH = 6;
const SHORT_ID_PATTERN = /^[A-Z0-9]{5,7}$/;

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

export function normalizeAppointmentId(id: string) {
  return id.trim().toUpperCase();
}

export function isValidAppointmentId(id: string) {
  return SHORT_ID_PATTERN.test(normalizeAppointmentId(id));
}

export function generateAppointmentId() {
  let id = '';

  for (let index = 0; index < SHORT_ID_LENGTH; index += 1) {
    const nextCharacter =
      SHORT_ID_ALPHABET[Math.floor(Math.random() * SHORT_ID_ALPHABET.length)];

    id += nextCharacter;
  }

  return id;
}

export function buildPublicLandingPageUrl(id: string, origin = getConfiguredPublicAppOrigin()) {
  const normalizedId = normalizeAppointmentId(id);

  return `${origin}/r/${encodeURIComponent(normalizedId)}`;
}

export function buildPreviewImageUrl(id: string, origin = getConfiguredPublicAppOrigin()) {
  const normalizedId = normalizeAppointmentId(id);

  return `${origin}/r/${encodeURIComponent(normalizedId)}/preview-image`;
}

export function buildExtensionLandingPageUrl(id: string) {
  const route =
    `/repple.html?id=${encodeURIComponent(id)}` as `/repple.html?id=${string}`;

  if (browser?.runtime?.id) {
    return browser.runtime.getURL(route);
  }

  return `${window.location.origin}${route}`;
}

export function buildLandingPageUrl(id: string) {
  return buildPublicLandingPageUrl(id);
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

  return variants[hashString(record.id) % variants.length];
}

export function buildSmsText(record: Pick<
  AppointmentRecord,
  | 'id'
  | 'firstName'
  | 'salespersonName'
  | 'dealershipName'
  | 'appointmentTime'
  | 'vehicle'
  | 'landingPageUrl'
>) {
  return `Hey ${record.firstName}, ${buildSmsLead(record)} ${record.landingPageUrl}`;
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

export function createAppointmentRecord(
  draft: AppointmentDraft,
  options?: { id?: string },
): AppointmentRecord {
  const id = normalizeAppointmentId(options?.id ?? generateAppointmentId());

  if (!isValidAppointmentId(id)) {
    throw new Error('Unable to generate a valid public appointment ID.');
  }

  const landingPageUrl = buildPublicLandingPageUrl(id);

  const baseRecord = {
    id,
    firstName: draft.firstName.trim(),
    vehicle: draft.vehicle.trim(),
    appointmentTime: draft.appointmentTime.trim(),
    salespersonName: draft.salespersonName.trim(),
    dealershipName: DEALERSHIP_NAME,
    dealershipAddress: DEALERSHIP_ADDRESS,
    landingPageUrl,
    previewImageUrl: buildPreviewImageUrl(id),
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
