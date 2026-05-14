import crypto from 'node:crypto';

import {
  DEFAULT_HEYGEN_DIMENSIONS,
  buildAppointmentVideoScript,
  normalizeHeygenSceneTemplateKey,
  type HeygenSceneTemplateKey,
} from '../../../shared/heygen';
import type { AppointmentRecord } from '../../../shared/repple-contract';
import { getHeygenEnv, getSiteUrl } from './env';

const HEYGEN_API_BASE = 'https://api.heygen.com';

type HeygenOrganizationSettings = {
  heygen_avatar_id?: string | null;
  heygen_voice_id?: string | null;
  heygen_scene_template_key?: string | null;
};

type HeygenGenerationConfig = {
  apiKey: string;
  avatarId: string;
  voiceId: string;
  webhookSecret: string;
  sceneTemplateKey: HeygenSceneTemplateKey;
};

type HeygenCreateVideoResponse = {
  data?: {
    id?: string;
    video_id?: string;
  } | null;
  error?: {
    message?: string;
  } | null;
  message?: string;
};

type HeygenCallbackEvent = {
  shortId: string | null;
  videoId: string | null;
  status: 'processing' | 'completed' | 'failed' | null;
  videoUrl: string | null;
  videoThumbnailUrl: string | null;
  videoSharePageUrl: string | null;
  error: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeHexColor(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';

  if (!/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(normalized)) {
    return null;
  }

  if (normalized.length === 4) {
    return `#${normalized
      .slice(1)
      .split('')
      .map((character) => `${character}${character}`)
      .join('')}`;
  }

  return normalized;
}

function resolveSceneBackgroundColor(
  sceneTemplateKey: HeygenSceneTemplateKey,
  accentColor: string | null | undefined,
) {
  const brandColor = normalizeHexColor(accentColor);

  if (brandColor) {
    return brandColor;
  }

  switch (sceneTemplateKey) {
    case 'arrival-concierge':
      return '#0F172A';
    case 'premium-confirmation':
      return '#7A5E2B';
    default:
      return '#1848C6';
  }
}

function buildCallbackSignature(shortId: string, webhookSecret: string) {
  return crypto.createHmac('sha256', webhookSecret).update(shortId, 'utf8').digest('hex');
}

function buildHeygenCallbackUrl(shortId: string, webhookSecret: string) {
  const callbackUrl = new URL('/api/heygen/callback', getSiteUrl());
  callbackUrl.searchParams.set('appointment', shortId);
  callbackUrl.searchParams.set('sig', buildCallbackSignature(shortId, webhookSecret));
  return callbackUrl.toString();
}

export function getHeygenGenerationConfig(input: {
  organizationSettings?: HeygenOrganizationSettings | null;
}) {
  const env = getHeygenEnv();
  const avatarId =
    readString(input.organizationSettings?.heygen_avatar_id) ?? env.defaultAvatarId ?? null;
  const voiceId =
    readString(input.organizationSettings?.heygen_voice_id) ?? env.defaultVoiceId ?? null;
  const webhookSecret = env.webhookSecret;
  const apiKey = env.apiKey;

  if (!apiKey || !webhookSecret || !avatarId || !voiceId) {
    return null;
  }

  return {
    apiKey,
    avatarId,
    voiceId,
    webhookSecret,
    sceneTemplateKey: normalizeHeygenSceneTemplateKey(
      input.organizationSettings?.heygen_scene_template_key ?? env.defaultSceneTemplateKey,
    ),
  } satisfies HeygenGenerationConfig;
}

export async function requestAppointmentHeygenVideo(input: {
  organizationSettings?: HeygenOrganizationSettings | null;
  organizationBrandColor?: string | null;
  record: AppointmentRecord;
}) {
  const config = getHeygenGenerationConfig({
    organizationSettings: input.organizationSettings,
  });

  if (!config) {
    return null;
  }

  const response = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey,
    },
    body: JSON.stringify({
      title: `Repple ${input.record.id}`,
      caption: false,
      callback_id: input.record.id,
      callback_url: buildHeygenCallbackUrl(input.record.id, config.webhookSecret),
      dimension: DEFAULT_HEYGEN_DIMENSIONS,
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: config.avatarId,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            voice_id: config.voiceId,
            input_text: buildAppointmentVideoScript(
              input.record,
              config.sceneTemplateKey,
            ),
          },
          background: {
            type: 'color',
            value: resolveSceneBackgroundColor(
              config.sceneTemplateKey,
              input.organizationBrandColor,
            ),
          },
        },
      ],
    }),
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as HeygenCreateVideoResponse | null;
  const videoId = readString(payload?.data?.video_id) ?? readString(payload?.data?.id);

  if (!response.ok || !videoId) {
    throw new Error(payload?.error?.message ?? payload?.message ?? 'HeyGen video request failed.');
  }

  return {
    videoId,
    initialStatus: 'queued' as const,
  };
}

export function verifyHeygenCallbackSignature(request: Request, shortId: string) {
  const { webhookSecret } = getHeygenEnv();

  if (!webhookSecret) {
    return false;
  }

  const requestUrl = new URL(request.url);
  const signature = requestUrl.searchParams.get('sig')?.trim() ?? '';

  if (!signature) {
    return false;
  }

  const expected = buildCallbackSignature(shortId, webhookSecret);

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export async function parseHeygenCallbackRequest(request: Request): Promise<HeygenCallbackEvent> {
  const payload = (await request.json().catch(() => null)) as unknown;
  const requestUrl = new URL(request.url);
  const root = isRecord(payload) ? payload : {};
  const eventData = isRecord(root.event_data)
    ? root.event_data
    : isRecord(root.data)
      ? root.data
      : {};
  const eventType = readString(root.event_type) ?? readString(root.type) ?? '';
  const shortId =
    readString(eventData.callback_id) ??
    readString(root.callback_id) ??
    readString(requestUrl.searchParams.get('appointment'));
  const videoId =
    readString(eventData.video_id) ??
    readString(eventData.id) ??
    readString(root.video_id) ??
    readString(root.id);
  const videoUrl =
    readString(eventData.video_url) ??
    readString(eventData.url) ??
    readString(root.video_url) ??
    readString(root.url);
  const videoThumbnailUrl =
    readString(eventData.thumbnail_url) ??
    readString(eventData.cover_url) ??
    readString(eventData.gif_url) ??
    readString(root.thumbnail_url) ??
    readString(root.cover_url) ??
    readString(root.gif_url);
  const videoSharePageUrl =
    readString(eventData.share_url) ??
    readString(eventData.share_page_url) ??
    readString(eventData.video_page_url) ??
    readString(root.share_url) ??
    readString(root.share_page_url) ??
    readString(root.video_page_url);
  const error =
    readString(eventData.error) ??
    readString(eventData.message) ??
    readString(root.message) ??
    readString(isRecord(root.error) ? root.error.message : root.error);

  let status: HeygenCallbackEvent['status'] = null;

  if (eventType === 'avatar_video.success') {
    status = 'completed';
  } else if (eventType === 'avatar_video.fail') {
    status = 'failed';
  } else {
    const rawStatus = readString(eventData.status) ?? readString(root.status);

    if (rawStatus === 'completed' || rawStatus === 'success') {
      status = 'completed';
    } else if (rawStatus === 'failed' || rawStatus === 'error') {
      status = 'failed';
    } else if (rawStatus === 'processing' || rawStatus === 'pending' || rawStatus === 'queued') {
      status = 'processing';
    }
  }

  return {
    shortId,
    videoId,
    status,
    videoUrl,
    videoThumbnailUrl,
    videoSharePageUrl,
    error,
  };
}
