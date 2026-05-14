import {
  buildPublicLandingPageUrl,
  buildPreviewImageUrl,
  createAppointmentRecord,
  generateAppointmentId,
  isStandardAppointmentId,
  isSupportedAppointmentId,
  normalizeAppointmentId,
} from './repple';
import {
  getAppointment as getLocalAppointment,
  listAppointments as listLocalAppointments,
  saveAppointment as saveLocalAppointment,
} from './storage';
import { isDevelopment, shouldUseLocalFallback, supabase } from './supabase';
import { recordWorkspaceAppointmentEvent } from './analytics';
import { sortAppointmentsByLatestActivity } from '../shared/appointment-status';
import { assertOrganizationCanGenerateAppointments } from '../shared/billing';
import type { AppointmentDraft, AppointmentRecord } from './types';
import type { WorkspaceContext } from '../shared/auth-contract';
import { hydrateProductionAppointmentRecord } from '../shared/appointment-record';
import type { AppointmentRow } from '../shared/supabase-schema';
import type { VehicleImageSelection } from '../shared/repple-contract';

const APPOINTMENTS_TABLE = 'appointments';
const MAX_SHORT_ID_ATTEMPTS = 5;
const PRODUCTION_APPOINTMENT_SELECT =
  'id, organization_id, created_by_profile_id, short_id, customer_name, customer_phone_optional, vehicle, vin_optional, vehicle_image_url, appointment_time, salesperson_name, salesperson_title, salesperson_avatar_url, dealership_name, dealership_address, public_url, created_at, opened_at, confirmed_at, reschedule_requested_at, reschedule_note, status';

function hydrateAppointmentRecord(row: AppointmentRow) {
  return hydrateProductionAppointmentRecord(row, {
    buildPublicLandingPageUrl,
    buildPreviewImageUrl,
  });
}

function applyWorkspaceBranding(record: AppointmentRecord, workspace: WorkspaceContext) {
  return {
    ...record,
    dealershipLogoUrl:
      workspace.activeMembership.organization.logo_url ?? record.dealershipLogoUrl ?? null,
    dealershipBrandColor:
      workspace.activeMembership.organization.brand_color ?? record.dealershipBrandColor ?? null,
  };
}

function buildDraftWithWorkspaceDefaults(
  draft: AppointmentDraft,
  workspace: WorkspaceContext,
) {
  return {
    firstName: draft.firstName.trim(),
    vehicle: draft.vehicle.trim(),
    appointmentTime: draft.appointmentTime.trim(),
    salespersonName: draft.salespersonName.trim() || workspace.profile.full_name?.trim() || '',
    dealershipName: draft.dealershipName.trim() || workspace.activeMembership.organization.name,
    dealershipAddress:
      draft.dealershipAddress.trim() || workspace.activeMembership.organization.address?.trim() || '',
  } satisfies AppointmentDraft;
}

function buildAppointmentInsertPayload(
  record: AppointmentRecord,
  workspace: WorkspaceContext,
  options?: { vin?: string | null },
) {
  return {
    organization_id: workspace.activeMembership.organization.id,
    created_by_profile_id: workspace.profile.id,
    short_id: record.id,
    customer_name: record.firstName,
    customer_phone_optional: null,
    vehicle: record.vehicle,
    vin_optional: options?.vin?.trim() ?? null,
    vehicle_image_url: record.vehicleImageUrl,
    appointment_time: record.appointmentTime,
    salesperson_name: record.salespersonName,
    salesperson_title: workspace.profile.title ?? null,
    salesperson_avatar_url: workspace.profile.avatar_url ?? null,
    dealership_name: record.dealershipName,
    dealership_address: record.dealershipAddress,
    public_url: record.landingPageUrl,
    created_at: record.createdAt,
    opened_at: record.viewedAt,
    confirmed_at: record.confirmedAt,
    reschedule_requested_at: record.rescheduleRequestedAt,
    reschedule_note: record.rescheduleNote,
    status: record.status ?? 'generated',
  };
}

function isDuplicateShortIdError(error: { code?: string; message: string } | null) {
  return error?.code === '23505' || error?.message.includes('short_id');
}

export async function saveAppointmentRecord(
  record: AppointmentRecord,
  options?: {
    vin?: string | null;
  },
  workspace?: WorkspaceContext,
): Promise<AppointmentRecord> {
  if (shouldUseLocalFallback || !supabase || !workspace) {
    await saveLocalAppointment(record);
    return record;
  }

  const { data, error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .insert(buildAppointmentInsertPayload(record, workspace, options))
    .select(PRODUCTION_APPOINTMENT_SELECT)
    .single();

  if (error) {
    if (isDevelopment) {
      await saveLocalAppointment(record);
      return record;
    }

    throw new Error(error.message);
  }

  const hydratedRecord = {
    ...hydrateAppointmentRecord(data as AppointmentRow),
    dealershipLogoUrl:
      workspace.activeMembership.organization.logo_url ?? record.dealershipLogoUrl ?? null,
    dealershipBrandColor:
      workspace.activeMembership.organization.brand_color ?? record.dealershipBrandColor ?? null,
  };
  await saveLocalAppointment(hydratedRecord);
  return hydratedRecord;
}

export async function createAndSaveAppointmentRecord(
  draft: AppointmentDraft,
  options?: {
    vehicleImage?: VehicleImageSelection | null;
    vin?: string | null;
    workspace?: WorkspaceContext;
  },
): Promise<AppointmentRecord> {
  const workspace = options?.workspace;

  if (
    workspace &&
    !shouldUseLocalFallback
  ) {
    assertOrganizationCanGenerateAppointments(
      workspace.activeMembership.organization.subscription_status,
    );
  }

  if (shouldUseLocalFallback || !supabase || !workspace) {
    const record = createAppointmentRecord(draft, {
      vehicleImage: options?.vehicleImage ?? null,
      smsTemplate: workspace?.organizationSettings?.default_sms_template ?? null,
      dealershipLogoUrl: workspace?.activeMembership.organization.logo_url ?? null,
      dealershipBrandColor: workspace?.activeMembership.organization.brand_color ?? null,
    });

    await saveLocalAppointment(record);
    return record;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_SHORT_ID_ATTEMPTS; attempt += 1) {
    const record = createAppointmentRecord(buildDraftWithWorkspaceDefaults(draft, workspace), {
      id: generateAppointmentId(),
      vehicleImage: options?.vehicleImage ?? null,
      smsTemplate: workspace.organizationSettings?.default_sms_template ?? null,
      dealershipLogoUrl: workspace.activeMembership.organization.logo_url ?? null,
      dealershipBrandColor: workspace.activeMembership.organization.brand_color ?? null,
    });

    if (!isStandardAppointmentId(record.id)) {
      continue;
    }

    try {
      const savedRecord = await saveAppointmentRecord(
        {
          ...record,
          organizationId: workspace.activeMembership.organization.id,
          createdByProfileId: workspace.profile.id,
          salespersonTitle: workspace.profile.title ?? null,
          salespersonAvatarUrl: workspace.profile.avatar_url ?? null,
          status: 'generated',
        },
        {
          vin: options?.vin ?? null,
        },
        workspace,
      );

      void recordWorkspaceAppointmentEvent(savedRecord.id, 'appointment_created', {
        source: 'extension',
        vehicle: savedRecord.vehicle,
        appointment_time: savedRecord.appointmentTime,
      });

      return savedRecord;
    } catch (error) {
      if (
        error instanceof Error &&
        isDuplicateShortIdError({ message: error.message })
      ) {
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
  _landingPageUrl: string,
  workspace?: WorkspaceContext,
): Promise<AppointmentRecord | null> {
  const normalizedId = normalizeAppointmentId(id);

  if (!isSupportedAppointmentId(normalizedId)) {
    return null;
  }

  if (shouldUseLocalFallback || !supabase || !workspace) {
    return getLocalAppointment(normalizedId);
  }

  const { data, error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .select(PRODUCTION_APPOINTMENT_SELECT)
    .eq('organization_id', workspace.activeMembership.organization.id)
    .eq('short_id', normalizedId)
    .maybeSingle();

  if (error) {
    if (isDevelopment) {
      return getLocalAppointment(normalizedId);
    }

    throw new Error(error.message);
  }

  if (!data) {
    return getLocalAppointment(normalizedId);
  }

  const record = applyWorkspaceBranding(
    hydrateAppointmentRecord(data as AppointmentRow),
    workspace,
  );
  await saveLocalAppointment(record);
  return record;
}

export async function listRecentAppointmentRecords(workspace?: WorkspaceContext) {
  const localRecords = await listLocalAppointments();
  const sortedLocalRecords = sortAppointmentsByLatestActivity(localRecords);

  if (shouldUseLocalFallback || !supabase || !workspace) {
    return sortedLocalRecords;
  }

  const { data, error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .select(PRODUCTION_APPOINTMENT_SELECT)
    .eq('organization_id', workspace.activeMembership.organization.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    if (isDevelopment) {
      return sortedLocalRecords;
    }

    throw new Error(error.message);
  }

  const remoteRecords = ((data ?? []) as AppointmentRow[]).map((row) =>
    applyWorkspaceBranding(hydrateAppointmentRecord(row), workspace),
  );
  const sortedRemoteRecords = sortAppointmentsByLatestActivity(remoteRecords);

  await Promise.all(sortedRemoteRecords.map((record) => saveLocalAppointment(record)));

  return sortedRemoteRecords;
}
