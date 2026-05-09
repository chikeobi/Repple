import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

import {
  hydrateAppointmentRecord,
  isValidAppointmentId,
  normalizeAppointmentId,
  normalizeSupabaseRow,
  type AppointmentRecord,
  type SupabaseAppointmentRow,
} from './repple';

const APPOINTMENTS_TABLE = 'repple_appointments';
const supabaseUrl =
  process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

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

export const getAppointmentRecord = cache(
  async (shortId: string): Promise<AppointmentRecord | null> => {
    if (!supabase) {
      return null;
    }

    const normalizedShortId = normalizeAppointmentId(shortId);

    if (!isValidAppointmentId(normalizedShortId)) {
      return null;
    }

    const { data, error } = await supabase
      .from(APPOINTMENTS_TABLE)
      .select(
        'generated_id, customer_name, vehicle, appointment_time, salesperson_name, dealership_name, address, created_at',
      )
      .eq('generated_id', normalizedShortId)
      .maybeSingle();

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
