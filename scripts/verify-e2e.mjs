import { createClient } from '@supabase/supabase-js';

import { getConfig, loadEnv } from './lib/env.mjs';
import { createUniqueAppointmentId, normalizeAppointmentId } from './lib/id-utils.mjs';

function getClient(url, key) {
  if (!url || !key) {
    throw new Error('Supabase credentials are missing. Check .env and .env.example.');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function isMissingLegacyColumnError(message) {
  return String(message || '').includes('legacy_generated_id');
}

function buildPublicUrl(siteUrl, id) {
  return `${siteUrl}/r/${encodeURIComponent(normalizeAppointmentId(id))}`;
}

async function fetchPublicPage(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'repple-e2e-verifier',
    },
  });

  return {
    body: await response.text(),
    contentType: response.headers.get('content-type') || '',
    ok: response.ok,
    status: response.status,
  };
}

async function cleanupIfPossible(client, id) {
  await client.from('repple_appointments').delete().eq('generated_id', id);
}

async function main() {
  const config = getConfig(loadEnv());
  const anonClient = getClient(config.supabaseUrl, config.supabaseAnonKey);
  const serviceClient = config.supabaseServiceRoleKey
    ? getClient(config.supabaseUrl, config.supabaseServiceRoleKey)
    : null;
  const generatedId = createUniqueAppointmentId(new Set());
  const publicUrl = buildPublicUrl(config.siteUrl, generatedId);
  const previewUrl = `${publicUrl}/preview-image`;
  const timestamp = new Date().toISOString();

  const record = {
    generated_id: generatedId,
    legacy_generated_id: null,
    customer_name: `E2E ${generatedId}`,
    vehicle: '2026 Honda Accord',
    appointment_time: timestamp,
    salesperson_name: 'Repple Verifier',
    dealership_name: 'ABC Motors',
    address: '1284 West Loop Drive, Houston, TX 77027',
    created_at: timestamp,
  };

  let { error: insertError } = await anonClient.from('repple_appointments').insert(record);

  if (insertError && isMissingLegacyColumnError(insertError.message)) {
    ({ error: insertError } = await anonClient.from('repple_appointments').insert({
      generated_id: record.generated_id,
      customer_name: record.customer_name,
      vehicle: record.vehicle,
      appointment_time: record.appointment_time,
      salesperson_name: record.salesperson_name,
      dealership_name: record.dealership_name,
      address: record.address,
      created_at: record.created_at,
    }));
  }

  if (insertError) {
    throw new Error(`Insert failed: ${insertError.message}`);
  }

  try {
    let { data, error: readError } = await anonClient
      .from('repple_appointments')
      .select('generated_id, customer_name, legacy_generated_id')
      .eq('generated_id', generatedId)
      .maybeSingle();

    if (readError && isMissingLegacyColumnError(readError.message)) {
      ({ data, error: readError } = await anonClient
        .from('repple_appointments')
        .select('generated_id, customer_name')
        .eq('generated_id', generatedId)
        .maybeSingle());
    }

    if (readError) {
      throw new Error(`Fetch failed: ${readError.message}`);
    }

    if (!data?.generated_id) {
      throw new Error('Persisted appointment was not returned by Supabase.');
    }

    const publicPage = await fetchPublicPage(publicUrl);

    if (!publicPage.ok) {
      throw new Error(`Public URL fetch failed with status ${publicPage.status}: ${publicUrl}`);
    }

    if (!publicPage.body.includes(record.customer_name.split(' ')[0])) {
      throw new Error('Public page rendered, but expected customer content was not present.');
    }

    const previewPage = await fetchPublicPage(previewUrl);

    if (!previewPage.ok) {
      throw new Error(
        `Preview image fetch failed with status ${previewPage.status}: ${previewUrl}`,
      );
    }

    if (!previewPage.contentType.includes('image/png')) {
      throw new Error(`Preview image content type was ${previewPage.contentType}, expected image/png.`);
    }

    console.log(
      JSON.stringify(
        {
          generatedId,
          previewUrl,
          publicUrl,
          status: 'verified',
        },
        null,
        2,
      ),
    );
  } finally {
    if (serviceClient) {
      await cleanupIfPossible(serviceClient, generatedId);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
