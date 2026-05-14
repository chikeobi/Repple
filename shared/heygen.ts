import type { AppointmentRecord } from './repple-contract';

export const APPOINTMENT_VIDEO_STATUSES = [
  'not_requested',
  'queued',
  'processing',
  'completed',
  'failed',
  'disabled',
] as const;

export type AppointmentVideoStatus = (typeof APPOINTMENT_VIDEO_STATUSES)[number];

export const HEYGEN_SCENE_TEMPLATE_KEYS = [
  'showroom-welcome',
  'arrival-concierge',
  'premium-confirmation',
] as const;

export type HeygenSceneTemplateKey = (typeof HEYGEN_SCENE_TEMPLATE_KEYS)[number];

export const DEFAULT_HEYGEN_SCENE_TEMPLATE_KEY: HeygenSceneTemplateKey = 'showroom-welcome';
export const DEFAULT_HEYGEN_VIDEO_LIMIT = 20;
export const DEFAULT_HEYGEN_MAX_SCRIPT_CHARACTERS = 240;
export const DEFAULT_HEYGEN_DIMENSIONS = {
  width: 1280,
  height: 720,
} as const;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function trimSentence(value: string, maxLength: number) {
  const normalized = normalizeWhitespace(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}.`;
}

function buildScriptVariants(record: AppointmentRecord) {
  return {
    'showroom-welcome': [
      `Hi ${record.firstName}, this is ${record.salespersonName} from ${record.dealershipName}.`,
      `Your ${record.vehicle} appointment is set for ${record.appointmentTime}.`,
      `I look forward to welcoming you and making your visit easy when you arrive at ${record.dealershipAddress}.`,
    ],
    'arrival-concierge': [
      `Hi ${record.firstName}, ${record.salespersonName} here from ${record.dealershipName}.`,
      `We are ready for your ${record.vehicle} appointment on ${record.appointmentTime}.`,
      `When you arrive at ${record.dealershipAddress}, we will have everything prepared for a smooth visit.`,
    ],
    'premium-confirmation': [
      `Hi ${record.firstName}, this is ${record.salespersonName} with ${record.dealershipName}.`,
      `Your appointment for the ${record.vehicle} is confirmed for ${record.appointmentTime}.`,
      `We are looking forward to taking care of you at ${record.dealershipAddress}.`,
    ],
  } satisfies Record<HeygenSceneTemplateKey, string[]>;
}

export function normalizeHeygenSceneTemplateKey(
  value: string | null | undefined,
): HeygenSceneTemplateKey {
  switch (value) {
    case 'arrival-concierge':
    case 'premium-confirmation':
    case 'showroom-welcome':
      return value;
    default:
      return DEFAULT_HEYGEN_SCENE_TEMPLATE_KEY;
  }
}

export function buildAppointmentVideoScript(
  record: AppointmentRecord,
  templateKey?: string | null,
  maxCharacters = DEFAULT_HEYGEN_MAX_SCRIPT_CHARACTERS,
) {
  const variants = buildScriptVariants(record);
  const normalizedTemplateKey = normalizeHeygenSceneTemplateKey(templateKey);
  const script = variants[normalizedTemplateKey].join(' ');

  return trimSentence(script, maxCharacters);
}

export function shouldDisplayAppointmentVideo(record: Pick<
  AppointmentRecord,
  'videoStatus' | 'videoUrl'
>) {
  return record.videoStatus === 'completed' && Boolean(record.videoUrl?.trim());
}
