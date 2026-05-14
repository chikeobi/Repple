import { NextResponse } from 'next/server';

import { sanitizeMultilineText } from '../../../../../../../shared/sanitization';
import { updateAppointmentStatus } from '../../../../../lib/appointments';
import {
  allowPublicAppointmentAction,
  buildPublicActionFingerprint,
} from '../../../../../lib/public-actions';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shortId: string }> },
) {
  const { shortId } = await params;
  let payload: {
    action?: 'viewed' | 'confirmed' | 'reschedule_requested';
    rescheduleNote?: string | null;
  };

  try {
    payload = (await request.json()) as {
      action?: 'viewed' | 'confirmed' | 'reschedule_requested';
      rescheduleNote?: string | null;
    };
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid request body.',
      },
      { status: 400 },
    );
  }

  const action = payload.action;
  const rescheduleNote =
    typeof payload.rescheduleNote === 'string'
      ? sanitizeMultilineText(payload.rescheduleNote, 320)
      : '';

  if (
    action !== 'viewed' &&
    action !== 'confirmed' &&
    action !== 'reschedule_requested'
  ) {
    return NextResponse.json(
      {
        error: 'Invalid status action.',
      },
      { status: 400 },
    );
  }

  if (action === 'reschedule_requested' && !rescheduleNote) {
    return NextResponse.json(
      {
        error: 'A preferred reschedule time is required.',
      },
      { status: 400 },
    );
  }

  try {
    const allowed = await allowPublicAppointmentAction({
      shortId,
      action,
      fingerprint: buildPublicActionFingerprint(request),
    });

    if (!allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Too many public appointment actions. Please try again in a few minutes.',
        },
        { status: 429 },
      );
    }

    const record = await updateAppointmentStatus(shortId, action, {
      rescheduleNote: rescheduleNote || null,
    });

    return NextResponse.json({
      ok: true,
      record,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to update appointment status.',
      },
      { status: 500 },
    );
  }
}
