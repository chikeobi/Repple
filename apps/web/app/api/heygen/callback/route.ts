import { NextResponse } from 'next/server';

import { getSupabaseAdminClient } from '../../../../lib/supabase-admin';
import {
  parseHeygenCallbackRequest,
  verifyHeygenCallbackSignature,
} from '../../../../lib/heygen';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  try {
    const callback = await parseHeygenCallbackRequest(request);

    if (!callback.shortId || !callback.status) {
      return NextResponse.json(
        {
          error: 'Invalid HeyGen callback payload.',
        },
        { status: 400 },
      );
    }

    if (!verifyHeygenCallbackSignature(request, callback.shortId)) {
      return NextResponse.json(
        {
          error: 'Invalid HeyGen callback signature.',
        },
        { status: 401 },
      );
    }

    const adminClient = getSupabaseAdminClient();
    const appointmentsTable = adminClient.from('appointments') as any;
    const { data: appointmentData, error: appointmentError } = await appointmentsTable
      .select('id, short_id')
      .eq('short_id', callback.shortId)
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

    const now = new Date().toISOString();
    const patch: Record<string, string | null> =
      callback.status === 'completed'
        ? {
            video_status: 'completed',
            video_url: callback.videoUrl,
            video_thumbnail_url: callback.videoThumbnailUrl,
            video_share_page_url: callback.videoSharePageUrl,
            video_completed_at: now,
            video_error: null,
            ...(callback.videoId ? { video_external_id: callback.videoId } : {}),
          }
        : callback.status === 'failed'
          ? {
              video_status: 'failed',
            video_error: callback.error ?? 'Personalized video generation failed.',
            ...(callback.videoId ? { video_external_id: callback.videoId } : {}),
          }
          : {
              video_status: 'processing',
              ...(callback.videoId ? { video_external_id: callback.videoId } : {}),
            };

    const { error: updateError } = await appointmentsTable
      .update(patch)
      .eq('id', appointmentData.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to process the HeyGen callback right now.',
      },
      { status: 500 },
    );
  }
}
