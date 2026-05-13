import { createClient } from '@supabase/supabase-js';

import { getSupabasePublicEnv } from './env';

let cachedAdminClient: ReturnType<typeof createClient> | null = null;

function getRequiredServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }

  return serviceRoleKey;
}

export function getSupabaseAdminClient() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const { supabaseUrl } = getSupabasePublicEnv();

  if (!supabaseUrl) {
    throw new Error('Missing required environment variable: SUPABASE_URL');
  }

  cachedAdminClient = createClient(supabaseUrl, getRequiredServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return cachedAdminClient;
}
