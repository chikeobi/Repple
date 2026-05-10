import { createClient } from '@supabase/supabase-js';

import { getConfig, loadEnv } from './lib/env.mjs';
import {
  createUniqueAppointmentId,
  isLegacyAppointmentId,
  isStandardAppointmentId,
  normalizeAppointmentId,
} from './lib/id-utils.mjs';

const APPLY_FLAG = '--apply';
const DRY_RUN = !process.argv.includes(APPLY_FLAG);
const APPOINTMENT_SELECT = 'id, generated_id, legacy_generated_id, created_at';
const LEGACY_COMPAT_APPOINTMENT_SELECT = 'id, generated_id, created_at';

function getSupabaseClient(config, { useServiceRole }) {
  const apiKey = useServiceRole ? config.supabaseServiceRoleKey : config.supabaseAnonKey;

  if (!config.supabaseUrl || !apiKey) {
    throw new Error('Supabase credentials are missing. Check .env and .env.example.');
  }

  return createClient(config.supabaseUrl, apiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function buildMapping(rows) {
  const reservedIds = new Set();
  const mappings = [];

  for (const row of rows) {
    if (row.generated_id) {
      reservedIds.add(normalizeAppointmentId(row.generated_id));
    }

    if (row.legacy_generated_id) {
      reservedIds.add(normalizeAppointmentId(row.legacy_generated_id));
    }
  }

  for (const row of rows) {
    const generatedId = normalizeAppointmentId(row.generated_id || '');
    const legacyId = row.legacy_generated_id ? normalizeAppointmentId(row.legacy_generated_id) : null;

    if (isStandardAppointmentId(generatedId) && legacyId) {
      mappings.push({
        action: 'already-migrated',
        currentId: generatedId,
        legacyId,
        rowId: row.id,
      });
      continue;
    }

    if (isStandardAppointmentId(generatedId)) {
      continue;
    }

    if (!isLegacyAppointmentId(generatedId)) {
      mappings.push({
        action: 'unsupported',
        currentId: generatedId,
        legacyId,
        rowId: row.id,
      });
      continue;
    }

    mappings.push({
      action: 'migrate',
      currentId: createUniqueAppointmentId(reservedIds),
      legacyId: generatedId,
      rowId: row.id,
    });
  }

  return mappings;
}

function isMissingLegacyColumnError(message) {
  return String(message || '').includes('legacy_generated_id');
}

async function main() {
  const config = getConfig(loadEnv());
  const reader = getSupabaseClient(config, { useServiceRole: false });
  const writer = DRY_RUN ? null : getSupabaseClient(config, { useServiceRole: true });

  if (!DRY_RUN && !config.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for --apply migrations.');
  }

  let { data, error } = await reader
    .from('repple_appointments')
    .select(APPOINTMENT_SELECT)
    .order('created_at', { ascending: true });

  if (error && isMissingLegacyColumnError(error.message)) {
    ({ data, error } = await reader
      .from('repple_appointments')
      .select(LEGACY_COMPAT_APPOINTMENT_SELECT)
      .order('created_at', { ascending: true }));
  }

  if (error) {
    throw new Error(error.message);
  }

  const rows = data || [];
  const mappings = buildMapping(rows);
  const actionableMappings = mappings.filter((mapping) => mapping.action === 'migrate');

  console.log(
    JSON.stringify(
      {
        apply: !DRY_RUN,
        counts: {
          totalRows: rows.length,
          migrate: actionableMappings.length,
          alreadyMigrated: mappings.filter((mapping) => mapping.action === 'already-migrated').length,
          unsupported: mappings.filter((mapping) => mapping.action === 'unsupported').length,
        },
        mappings,
      },
      null,
      2,
    ),
  );

  if (DRY_RUN || actionableMappings.length === 0) {
    return;
  }

  if (!rows.some((row) => 'legacy_generated_id' in row)) {
    throw new Error(
      'legacy_generated_id is missing from the live schema. Apply supabase/schema.sql before running --apply.',
    );
  }

  for (const mapping of actionableMappings) {
    const { error: updateError } = await writer
      .from('repple_appointments')
      .update({
        generated_id: mapping.currentId,
        legacy_generated_id: mapping.legacyId,
      })
      .eq('id', mapping.rowId);

    if (updateError) {
      throw new Error(
        `Unable to migrate row ${mapping.rowId} from ${mapping.legacyId} to ${mapping.currentId}: ${updateError.message}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
