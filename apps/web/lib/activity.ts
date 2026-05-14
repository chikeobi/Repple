'use client';

import type { OrganizationMembership, WorkspaceProfile } from '../../../shared/auth-contract';
import { hydrateProductionAppointmentRecord } from '../../../shared/appointment-record';
import { sortAppointmentsByLatestActivity } from '../../../shared/appointment-status';
import type { AppointmentRow } from '../../../shared/supabase-schema';
import { buildPreviewImageUrl, buildPublicLandingPageUrl, type AppointmentRecord } from './repple';
import { supabaseBrowser } from './supabase-browser';

const APPOINTMENT_ACTIVITY_SELECT =
  'id, organization_id, created_by_profile_id, short_id, customer_name, customer_phone_optional, vehicle, vin_optional, vehicle_image_url, vehicle_image_provider, appointment_time, salesperson_name, salesperson_title, salesperson_avatar_url, dealership_name, dealership_address, public_url, created_at, opened_at, confirmed_at, reschedule_requested_at, reschedule_note, status';

function hydrateAppointment(row: AppointmentRow, membership: OrganizationMembership) {
  return {
    ...hydrateProductionAppointmentRecord(row, {
      buildPublicLandingPageUrl,
      buildPreviewImageUrl,
    }),
    dealershipLogoUrl: membership.organization.logo_url ?? null,
    dealershipBrandColor: membership.organization.brand_color ?? null,
  };
}

export async function listOrganizationActivityRecords(input: {
  membership: OrganizationMembership;
  profile: WorkspaceProfile;
  repFilter: 'all' | 'mine' | string;
}) {
  if (!supabaseBrowser) {
    throw new Error('Supabase is not configured for the web app.');
  }

  let query = supabaseBrowser
    .from('appointments')
    .select(APPOINTMENT_ACTIVITY_SELECT)
    .eq('organization_id', input.membership.organization.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (input.repFilter === 'mine') {
    query = query.eq('created_by_profile_id', input.profile.id);
  } else if (input.repFilter !== 'all') {
    query = query.eq('created_by_profile_id', input.repFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return sortAppointmentsByLatestActivity(
    ((data ?? []) as AppointmentRow[]).map((row) => hydrateAppointment(row, input.membership)),
  );
}

export function buildRepOptions(
  records: AppointmentRecord[],
  profile: WorkspaceProfile,
) {
  const seen = new Map<string, string>();

  for (const record of records) {
    if (!record.createdByProfileId) {
      continue;
    }

    const label = record.salespersonName.trim() || 'Sales Rep';

    if (!seen.has(record.createdByProfileId)) {
      seen.set(record.createdByProfileId, label);
    }
  }

  const options = Array.from(seen.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return [
    { value: 'all', label: 'All reps' },
    { value: 'mine', label: 'My cards' },
    ...options.filter((option) => option.value !== profile.id),
  ];
}
