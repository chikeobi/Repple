import {
  buildPublicLandingPageUrl,
  buildPreviewImageUrl,
  buildSmsText,
  createAppointmentRecord,
  generateAppointmentId,
  isLegacyAppointmentId,
  isStandardAppointmentId,
  isSupportedAppointmentId,
  normalizeAppointmentId,
} from './repple';
import { getAppointment as getLocalAppointment, saveAppointment as saveLocalAppointment } from './storage';
import { isDevelopment, shouldUseLocalFallback, supabase } from './supabase';
import type { AppointmentDraft, AppointmentRecord } from './types';
import { hydrateMockVideoGeneration, reconcileMockVideoGeneration } from './video-generation';
import type { VehicleImageSelection } from '../shared/repple-contract';

const APPOINTMENTS_TABLE = 'repple_appointments';
const MAX_SHORT_ID_ATTEMPTS = 5;
const APPOINTMENT_SELECT =
  'generated_id, legacy_generated_id, customer_name, vehicle, appointment_time, salesperson_name, dealership_name, address, vehicle_image_url, vehicle_image_provider, vehicle_image_source_page_url, vehicle_image_confidence, created_at';
const LEGACY_COMPAT_APPOINTMENT_SELECT =
  'generated_id, customer_name, vehicle, appointment_time, salesperson_name, dealership_name, address, vehicle_image_url, vehicle_image_provider, vehicle_image_source_page_url, vehicle_image_confidence, created_at';
const MINIMAL_APPOINTMENT_SELECT =
  'generated_id, customer_name, vehicle, appointment_time, salesperson_name, dealership_name, address, created_at';

type SupabaseAppointmentRow = {
  generated_id: string | null;
  legacy_generated_id?: string | null;
  customer_name: string | null;
  vehicle: string | null;
  appointment_time: string | null;
  salesperson_name: string | null;
  dealership_name: string | null;
  address: string | null;
  vehicle_image_url?: string | null;
  vehicle_image_provider?: string | null;
  vehicle_image_source_page_url?: string | null;
  vehicle_image_confidence?: string | null;
  created_at: string | null;
};

type FrozenSchemaAppointmentRow = {
  generated_id: string;
  legacy_generated_id: string | null;
  customer_name: string;
  vehicle: string;
  appointment_time: string;
  salesperson_name: string;
  dealership_name: string;
  address: string;
  vehicle_image_url: string | null;
  vehicle_image_provider:
    | 'crm-page'
    | 'inventory-page'
    | 'vin-lookup'
    | 'external-api'
    | 'fallback'
    | null;
  vehicle_image_source_page_url: string | null;
  vehicle_image_confidence: 'high' | 'medium' | 'low' | null;
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

function toSupabaseRow(record: AppointmentRecord): FrozenSchemaAppointmentRow {
  return {
    generated_id: record.id,
    legacy_generated_id: null,
    customer_name: record.firstName,
    vehicle: record.vehicle,
    appointment_time: record.appointmentTime,
    salesperson_name: record.salespersonName,
    dealership_name: record.dealershipName,
    address: record.dealershipAddress,
    vehicle_image_url: record.vehicleImageUrl,
    vehicle_image_provider: record.vehicleImageProvider,
    vehicle_image_source_page_url: record.vehicleImageSourcePageUrl,
    vehicle_image_confidence: record.vehicleImageConfidence,
    created_at: record.createdAt,
  };
}

function toLegacyCompatibleSupabaseRow(record: AppointmentRecord) {
  return {
    generated_id: record.id,
    customer_name: record.firstName,
    vehicle: record.vehicle,
    appointment_time: record.appointmentTime,
    salesperson_name: record.salespersonName,
    dealership_name: record.dealershipName,
    address: record.dealershipAddress,
    vehicle_image_url: record.vehicleImageUrl,
    vehicle_image_provider: record.vehicleImageProvider,
    vehicle_image_source_page_url: record.vehicleImageSourcePageUrl,
    vehicle_image_confidence: record.vehicleImageConfidence,
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

  const vehicleImageProvider = row.vehicle_image_provider ?? null;
  const vehicleImageConfidence = row.vehicle_image_confidence ?? null;

  if (
    vehicleImageProvider &&
    !['crm-page', 'inventory-page', 'vin-lookup', 'external-api', 'fallback'].includes(
      vehicleImageProvider,
    )
  ) {
    return null;
  }

  if (vehicleImageConfidence && !['high', 'medium', 'low'].includes(vehicleImageConfidence)) {
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
    vehicle_image_url: row.vehicle_image_url ?? null,
    vehicle_image_provider: vehicleImageProvider as FrozenSchemaAppointmentRow['vehicle_image_provider'],
    vehicle_image_source_page_url: row.vehicle_image_source_page_url ?? null,
    vehicle_image_confidence:
      vehicleImageConfidence as FrozenSchemaAppointmentRow['vehicle_image_confidence'],
    created_at: row.created_at,
  };
}

function fromSupabaseRow(
  row: FrozenSchemaAppointmentRow,
  _landingPageUrl: string,
): AppointmentRecord {
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

export async function saveAppointmentRecord(record: AppointmentRecord): Promise<AppointmentRecord> {
  if (shouldUseLocalFallback) {
    await saveLocalAppointment(record);
    return record;
  }

  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set WXT_SUPABASE_URL and WXT_SUPABASE_ANON_KEY.',
    );
  }

  let { error } = await supabase.from(APPOINTMENTS_TABLE).insert(toSupabaseRow(record));

  if (error && (isMissingLegacyColumnError(error) || isMissingVehicleImageColumnError(error))) {
    ({ error } = await supabase
      .from(APPOINTMENTS_TABLE)
      .insert(toLegacyCompatibleSupabaseRow(record)));
  }

  if (error && isMissingVehicleImageColumnError(error)) {
    ({ error } = await supabase.from(APPOINTMENTS_TABLE).insert({
      generated_id: record.id,
      customer_name: record.firstName,
      vehicle: record.vehicle,
      appointment_time: record.appointmentTime,
      salesperson_name: record.salespersonName,
      dealership_name: record.dealershipName,
      address: record.dealershipAddress,
      created_at: record.createdAt,
    }));
  }

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

function isMissingLegacyColumnError(error: SupabaseError) {
  return error.code === '42703' || error.message.includes('legacy_generated_id');
}

function isMissingVehicleImageColumnError(error: SupabaseError) {
  return error.code === '42703' || error.message.includes('vehicle_image_');
}

async function selectAppointmentRow(id: string) {
  const baseQuery = supabase!.from(APPOINTMENTS_TABLE);
  const fullQuery = baseQuery.select(APPOINTMENT_SELECT);
  const fullRequest = isLegacyAppointmentId(id)
    ? fullQuery.or(`generated_id.eq.${id},legacy_generated_id.eq.${id}`)
    : fullQuery.eq('generated_id', id);
  const fullResult = await fullRequest.maybeSingle();

  if (!fullResult.error) {
    return fullResult;
  }

  if (
    !isMissingLegacyColumnError(fullResult.error) &&
    !isMissingVehicleImageColumnError(fullResult.error)
  ) {
    return fullResult;
  }

  const legacyResult = await baseQuery
    .select(LEGACY_COMPAT_APPOINTMENT_SELECT)
    .eq('generated_id', id)
    .maybeSingle();

  if (!legacyResult.error) {
    return legacyResult;
  }

  if (!isMissingVehicleImageColumnError(legacyResult.error)) {
    return legacyResult;
  }

  return baseQuery.select(MINIMAL_APPOINTMENT_SELECT).eq('generated_id', id).maybeSingle();
}

export async function createAndSaveAppointmentRecord(
  draft: AppointmentDraft,
  options?: { vehicleImage?: VehicleImageSelection | null },
): Promise<AppointmentRecord> {
  if (shouldUseLocalFallback) {
    const record = createAppointmentRecord(draft, {
      vehicleImage: options?.vehicleImage ?? null,
    });

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
      vehicleImage: options?.vehicleImage ?? null,
    });

    if (!isStandardAppointmentId(record.id)) {
      continue;
    }

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

  if (!isSupportedAppointmentId(normalizedId)) {
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

  const { data, error } = await selectAppointmentRow(normalizedId);

  if (error) {
    if (isDevelopment) {
      return getLocalAppointment(normalizedId);
    }

    throw toError(error);
  }

  const row = normalizeSupabaseRow(data as SupabaseAppointmentRow | undefined);

  if (!row) {
    return null;
  }

  return fromSupabaseRow(row, landingPageUrl);
}
