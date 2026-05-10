export const STANDARD_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const STANDARD_ID_LENGTH = 6;
export const STANDARD_ID_PATTERN = /^[A-Z0-9]{6}$/;
export const LEGACY_ID_PATTERN = /^rep_[a-z0-9]+$/i;

export function normalizeAppointmentId(id) {
  const trimmed = String(id || '').trim();

  if (LEGACY_ID_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return trimmed.toUpperCase();
}

export function isStandardAppointmentId(id) {
  return STANDARD_ID_PATTERN.test(normalizeAppointmentId(id));
}

export function isLegacyAppointmentId(id) {
  return LEGACY_ID_PATTERN.test(normalizeAppointmentId(id));
}

export function generateAppointmentId() {
  let id = '';

  for (let index = 0; index < STANDARD_ID_LENGTH; index += 1) {
    id += STANDARD_ID_ALPHABET[Math.floor(Math.random() * STANDARD_ID_ALPHABET.length)];
  }

  return id;
}

export function createUniqueAppointmentId(reservedIds) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const nextId = generateAppointmentId();

    if (!reservedIds.has(nextId)) {
      reservedIds.add(nextId);
      return nextId;
    }
  }

  throw new Error('Unable to generate a unique 6-character appointment ID.');
}
