import { NextResponse } from 'next/server';

import { hydrateProductionAppointmentRecord } from '../../../../../../../shared/appointment-record';
import type { OrganizationSettingsRow, AppointmentRow } from '../../../../../../../shared/supabase-schema';
import { createAuthedSupabaseClient } from '../../../../../lib/server-auth';
import { requestAppointmentHeygenVideo, getHeygenGenerationConfig } from '../../../../../lib/heygen';
import { buildPreviewImageUrl, buildPublicLandingPageUrl } from '../../../../../lib/repple';

export const dynamic = 'force-dynamic';

const APPOINTMENT_SELECT = [
  'id',
  'organization_id',
  'created_by_profile_id',
  'short_id',
  'customer_name',
  'customer_phone_optional',
  'vehicle',
  'vin_optional',
  'vehicle_image_url',
  'vehicle_image_provider',
  'video_status',
  'video_external_id',
  'video_url',
  'video_thumbnail_url',
  'video_share_page_url',
  'video_requested_at',
  'video_completed_at',
  'video_error',
  'appointment_time',
  'salesperson_name',
  'salesperson_title',
  'salesperson_avatar_url',
  'dealership_name',
  'dealership_address',
  'public_url',
  'created_at',
  'opened_at',
  'confirmed_at',
  'reschedule_requested_at',
  'reschedule_note',
  'status',
].join(', ');

type VideoStateResponse = {
  status: AppointmentRow['video_status'];
  url: string | null;
  thumbnailUrl: string | null;
  sharePageUrl: string | null;
  requestedAt: string | null;
  completedAt: string | null;
  error: string | null;
};

type UsageSummaryRow = {
  video_generation_usage_over_soft_limit: boolean;
};

function buildVideoState(row: Pick<
  AppointmentRow,
  | 'video_status'
  | 'video_url'
  | 'video_thumbnail_url'
  | 'video_share_page_url'
  | 'video_requested_at'
  | 'video_completed_at'
  | 'video_error'
>): VideoStateResponse {
  return {
    status: row.video_status,
    url: row.video_url ?? null,
    thumbnailUrl: row.video_thumbnail_url ?? null,
    sharePageUrl: row.video_share_page_url ?? null,
    requestedAt: row.video_requested_at ?? null,
    completedAt: row.video_completed_at ?? null,
    error: row.video_error ?? null,
  };
}

async function updateAppointmentVideoState(
  client: ReturnType<typeof createAuthedSupabaseClient>,
  appointmentId: string,
  patch: Partial<AppointmentRow>,
) {
  const { data, error } = await client
    .from('appointments')
    .update(patch)
    .eq('id', appointmentId)
    .select(APPOINTMENT_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to update the appointment video state.');
  }

  return data as unknown as AppointmentRow;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shortId: string }> },
) {
  try {
    const { shortId } = await params;
    const client = createAuthedSupabaseClient(request);
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: userError?.message ?? 'You must be signed in to request personalized video.',
        },
        { status: 401 },
      );
    }

    const { data: appointmentData, error: appointmentError } = await client
      .from('appointments')
      .select(APPOINTMENT_SELECT)
      .eq('short_id', shortId.trim().toUpperCase())
      .maybeSingle();

    if (appointmentError) {
      throw new Error(appointmentError.message);
    }

    if (!appointmentData) {
      return NextResponse.json(
        {
          error: 'Appointment not found.',
        },
        { status: 404 },
      );
    }

    const appointment = appointmentData as unknown as AppointmentRow;

    if (
      appointment.video_status === 'queued' ||
      appointment.video_status === 'processing' ||
      appointment.video_status === 'completed'
    ) {
      return NextResponse.json({
        ok: true,
        video: buildVideoState(appointment),
      });
    }

    const { data: organizationSettingsData, error: organizationSettingsError } = await client
      .from('organization_settings')
      .select(
        'organization_id, heygen_avatar_id, heygen_voice_id, heygen_scene_template_key',
      )
      .eq('organization_id', appointment.organization_id)
      .maybeSingle();

    if (organizationSettingsError) {
      throw new Error(organizationSettingsError.message);
    }

    const organizationSettings =
      (organizationSettingsData as unknown as Pick<
        OrganizationSettingsRow,
        | 'organization_id'
        | 'heygen_avatar_id'
        | 'heygen_voice_id'
        | 'heygen_scene_template_key'
      > | null) ?? null;

    if (!getHeygenGenerationConfig({ organizationSettings })) {
      const disabledAppointment = await updateAppointmentVideoState(client, appointment.id, {
        video_status: 'disabled',
        video_error: 'Personalized video is not enabled for this dealership yet.',
      });

      return NextResponse.json({
        ok: true,
        video: buildVideoState(disabledAppointment),
      });
    }

    const { data: usageSummaryData, error: usageSummaryError } = await client
      .rpc('get_organization_usage_summary', {
        input_organization_id: appointment.organization_id,
      })
      .single();

    if (usageSummaryError) {
      throw new Error(usageSummaryError.message);
    }

    const usageSummary = usageSummaryData as UsageSummaryRow | null;

    if (usageSummary?.video_generation_usage_over_soft_limit) {
      const disabledAppointment = await updateAppointmentVideoState(client, appointment.id, {
        video_status: 'disabled',
        video_error: 'This dealership reached its monthly personalized video limit.',
      });

      return NextResponse.json({
        ok: true,
        video: buildVideoState(disabledAppointment),
      });
    }

    const record = hydrateProductionAppointmentRecord(appointment, {
      buildPublicLandingPageUrl,
      buildPreviewImageUrl,
    });
    const generation = await requestAppointmentHeygenVideo({
      organizationSettings,
      record,
    });

    if (!generation) {
      const disabledAppointment = await updateAppointmentVideoState(client, appointment.id, {
        video_status: 'disabled',
        video_error: 'Personalized video is not enabled for this dealership yet.',
      });

      return NextResponse.json({
        ok: true,
        video: buildVideoState(disabledAppointment),
      });
    }

    const queuedAppointment = await updateAppointmentVideoState(client, appointment.id, {
      video_status: generation.initialStatus,
      video_external_id: generation.videoId,
      video_requested_at: new Date().toISOString(),
      video_completed_at: null,
      video_url: null,
      video_thumbnail_url: null,
      video_share_page_url: null,
      video_error: null,
    });

    void client.rpc('record_organization_usage', {
      input_organization_id: appointment.organization_id,
      input_media_usage_delta: 1,
      input_video_generation_usage_delta: 1,
    });

    return NextResponse.json({
      ok: true,
      video: buildVideoState(queuedAppointment),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to request personalized video right now.',
      },
      { status: 500 },
    );
  }
}
