import {
  buildPreviewImageUrl,
  buildSmsText,
  createAppointmentRecord,
  generateAppointmentId,
  isValidAppointmentId,
  normalizeAppointmentId,
} from './repple';
import { getAppointment as getLocalAppointment, saveAppointment as saveLocalAppointment } from './storage';
import { isDevelopment, shouldUseLocalFallback, supabase } from './supabase';
import type { AppointmentDraft, AppointmentRecord } from './types';
import { hydrateMockVideoGeneration, reconcileMockVideoGeneration } from './video-generation';

const APPOINTMENTS_TABLE = 'repple_appointments';
const MAX_SHORT_ID_ATTEMPTS = 5;

type SupabaseAppointmentRow = {
  generated_id: string | null;
  customer_name: string | null;
  vehicle: string | null;
  appointment_time: string | null;
  salesperson_name: string | null;
  dealership_name: string | null;
  address: string | null;
  created_at: string | null;
};

type FrozenSchemaAppointmentRow = {
  generated_id: string;
  customer_name: string;
  vehicle: string;
  appointment_time: string;
  salesperson_name: string;
  dealership_name: string;
  address: string;
  created_at: string;
};

type SupabaseError = {
  code?: string;
  message: string;
};

function toError(error: SupabaseError) {
  const nextError = new Error(error.message) as Error & { code?: string };
  nextError.code = error.code;
  return nextError;
}

function toSupabaseRow(
  record: AppointmentRecord,
): FrozenSchemaAppointmentRow {
  return {
    generated_id: record.id,
    customer_name: record.firstName,
    vehicle: record.vehicle,
    appointment_time: record.appointmentTime,
    salesperson_name: record.salespersonName,
    dealership_name: record.dealershipName,
    address: record.dealershipAddress,
    created_at: record.createdAt,
  };
}

function normalizeSupabaseRow(
  row: SupabaseAppointmentRow | null | undefined,
): FrozenSchemaAppointmentRow | null {
  if (!row) {
    return null;
  }

  if (
    !row.generated_id ||
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

  return {
    generated_id: row.generated_id,
    customer_name: row.customer_name,
    vehicle: row.vehicle,
    appointment_time: row.appointment_time,
    salesperson_name: row.salesperson_name,
    dealership_name: row.dealership_name,
    address: row.address,
    created_at: row.created_at,
  };
}

function fromSupabaseRow(
  row: FrozenSchemaAppointmentRow,
  landingPageUrl: string,
): AppointmentRecord {
  const baseRecord = {
    id: row.generated_id.trim(),
    firstName: row.customer_name.trim(),
    vehicle: row.vehicle.trim(),
    appointmentTime: row.appointment_time.trim(),
    salespersonName: row.salesperson_name.trim(),
    dealershipName: row.dealership_name.trim(),
    dealershipAddress: row.address.trim(),
    landingPageUrl,
    previewImageUrl: buildPreviewImageUrl(row.generated_id.trim()),
    smsText: '',
    createdAt: row.created_at,
  };

  const hydratedRecord = hydrateMockVideoGeneration(baseRecord);

  return {
    ...hydratedRecord,
    smsText: buildSmsText(hydratedRecord),
  };
}

export async function saveAppointmentRecord(
  record: AppointmentRecord,
): Promise<AppointmentRecord> {
  if (shouldUseLocalFallback) {
    await saveLocalAppointment(record);
    return record;
  }

  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set WXT_SUPABASE_URL and WXT_SUPABASE_ANON_KEY.',
    );
  }

  const { error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .insert(toSupabaseRow(record));

  if (error) {
    if (isDuplicateShortIdError(error)) {
      throw toError(error);
    }

    if (isDevelopment) {
      await saveLocalAppointment(record);
      return record;
    }

    throw toError(error);
  }

  return record;
}

function isDuplicateShortIdError(error: SupabaseError) {
  return error.code === '23505';
}

export async function createAndSaveAppointmentRecord(
  draft: AppointmentDraft,
): Promise<AppointmentRecord> {
  if (shouldUseLocalFallback) {
    const record = createAppointmentRecord(draft);

    await saveLocalAppointment(record);

    return record;
  }

  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set WXT_SUPABASE_URL and WXT_SUPABASE_ANON_KEY.',
    );
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_SHORT_ID_ATTEMPTS; attempt += 1) {
    const record = createAppointmentRecord(draft, {
      id: generateAppointmentId(),
    });

    try {
      return await saveAppointmentRecord(record);
    } catch (error) {
      if (error instanceof Error && isDuplicateShortIdError(error as SupabaseError)) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw (
    lastError ??
    new Error('Unable to reserve a unique public Repple link right now. Please try again.')
  );
}

export async function getAppointmentRecord(
  id: string,
  landingPageUrl: string,
): Promise<AppointmentRecord | null> {
  const normalizedId = normalizeAppointmentId(id);

  if (!isValidAppointmentId(normalizedId)) {
    return null;
  }

  if (shouldUseLocalFallback) {
    const localRecord = await getLocalAppointment(normalizedId);

    if (!localRecord) {
      return null;
    }

    const reconciled = reconcileMockVideoGeneration(localRecord);

    if (reconciled.changed) {
      await saveLocalAppointment(reconciled.record);
    }

    return reconciled.record;
  }

  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set WXT_SUPABASE_URL and WXT_SUPABASE_ANON_KEY.',
    );
  }

  const { data, error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .select(
      'generated_id, customer_name, vehicle, appointment_time, salesperson_name, dealership_name, address, created_at',
    )
    .eq('generated_id', normalizedId)
    .maybeSingle();

  if (error) {
    if (isDevelopment) {
      return getLocalAppointment(id);
    }

    throw toError(error);
  }

  const row = normalizeSupabaseRow(data as SupabaseAppointmentRow | undefined);

  if (!row) {
    return null;
  }

  return fromSupabaseRow(row, landingPageUrl);
}
