import { browser } from 'wxt/browser';

import type { AppointmentRecord } from './types';

const APPOINTMENT_PREFIX = 'repple:appointment:';

function getStorageKey(id: string) {
  return `${APPOINTMENT_PREFIX}${id}`;
}

export function saveAppointment(record: AppointmentRecord) {
  return browser.storage.local.set({ [getStorageKey(record.id)]: record });
}

export async function getAppointment(id: string) {
  const key = getStorageKey(id);
  const result = await browser.storage.local.get(key);

  return (result[key] as AppointmentRecord | undefined) ?? null;
}
