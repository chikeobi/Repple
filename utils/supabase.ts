import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.WXT_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.WXT_SUPABASE_ANON_KEY?.trim();

export const isDevelopment = import.meta.env.MODE === 'development';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const shouldUseLocalFallback = isDevelopment && !isSupabaseConfigured;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;
