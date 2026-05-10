import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

import {
  hydrateAppointmentRecord,
  isLegacyAppointmentId,
  isSupportedAppointmentId,
  normalizeAppointmentId,
  normalizeSupabaseRow,
  type AppointmentRecord,
  type SupabaseAppointmentRow,
} from './repple';
import { getSupabasePublicEnv } from './env';

const APPOINTMENTS_TABLE = 'repple_appointments';
const APPOINTMENT_SELECT =
  'generated_id, legacy_generated_id, customer_name, vehicle, appointment_time, salesperson_name, dealership_name, address, vehicle_image_url, vehicle_image_provider, vehicle_image_source_page_url, vehicle_image_confidence, created_at';
const LEGACY_COMPAT_APPOINTMENT_SELECT =
  'generated_id, customer_name, vehicle, appointment_time, salesperson_name, dealership_name, address, vehicle_image_url, vehicle_image_provider, vehicle_image_source_page_url, vehicle_image_confidence, created_at';
const MINIMAL_APPOINTMENT_SELECT =
  'generated_id, customer_name, vehicle, appointment_time, salesperson_name, dealership_name, address, created_at';
const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : null;

function isMissingLegacyColumnError(message: string) {
  return message.includes('legacy_generated_id');
}

function isMissingVehicleImageColumnError(message: string) {
  return message.includes('vehicle_image_');
}

export const getAppointmentRecord = cache(
  async (shortId: string): Promise<AppointmentRecord | null> => {
    if (!supabase) {
      throw new Error(
        'Supabase is not configured for the web app. Set SUPABASE_URL and SUPABASE_ANON_KEY.',
      );
    }

    const normalizedShortId = normalizeAppointmentId(shortId);

    if (!isSupportedAppointmentId(normalizedShortId)) {
      return null;
    }

    const baseQuery = supabase.from(APPOINTMENTS_TABLE).select(APPOINTMENT_SELECT);
    let { data, error } = await (isLegacyAppointmentId(normalizedShortId)
      ? baseQuery.or(
          `generated_id.eq.${normalizedShortId},legacy_generated_id.eq.${normalizedShortId}`,
        )
      : baseQuery.eq('generated_id', normalizedShortId)).maybeSingle();

    if (
      error &&
      (isMissingLegacyColumnError(error.message) ||
        isMissingVehicleImageColumnError(error.message))
    ) {
      ({ data, error } = await supabase
        .from(APPOINTMENTS_TABLE)
        .select(LEGACY_COMPAT_APPOINTMENT_SELECT)
        .eq('generated_id', normalizedShortId)
        .maybeSingle());

      if (error && isMissingVehicleImageColumnError(error.message)) {
        ({ data, error } = await supabase
          .from(APPOINTMENTS_TABLE)
          .select(MINIMAL_APPOINTMENT_SELECT)
          .eq('generated_id', normalizedShortId)
          .maybeSingle());
      }
    }

    if (error) {
      throw new Error(error.message);
    }

    const row = normalizeSupabaseRow(data as SupabaseAppointmentRow | undefined);

    if (!row) {
      return null;
    }

    return hydrateAppointmentRecord(row);
  },
);
