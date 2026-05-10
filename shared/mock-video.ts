import type { AppointmentRecord } from './repple-contract';
import { buildVehicleImageRenderUrl, buildFallbackVehicleImageDataUrl } from './vehicle-images';

type BaseAppointmentRecord = Omit<
  AppointmentRecord,
  | 'videoProvider'
  | 'videoStatus'
  | 'videoJobId'
  | 'videoUrl'
  | 'videoThumbnailUrl'
  | 'videoRequestedAt'
  | 'videoReadyAt'
>;

type VideoGenerationReconciliation = {
  changed: boolean;
  record: AppointmentRecord;
};

function getMockVideoDelayMs(seed: string) {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return 5000 + (hash % 5001);
}

function getMockVideoThumbnailUrl(
  record: Pick<AppointmentRecord, 'landingPageUrl' | 'vehicle' | 'vehicleImageUrl'>,
) {
  if (record.vehicleImageUrl) {
    return record.vehicleImageUrl;
  }

  try {
    const origin = new URL(record.landingPageUrl).origin;

    return buildVehicleImageRenderUrl(record.vehicle, origin);
  } catch {
    return buildFallbackVehicleImageDataUrl(record.vehicle);
  }
}

export function hydrateMockVideoGeneration(
  record: BaseAppointmentRecord,
): AppointmentRecord {
  const requestedAt = new Date(record.createdAt).getTime();
  const readyAt = requestedAt + getMockVideoDelayMs(record.id);

  return {
    ...record,
    videoProvider: 'mock',
    videoStatus: Date.now() >= readyAt ? 'ready' : 'processing',
    videoJobId: `mock_video_${record.id}`,
    videoUrl: `https://example.com/repple/mock-video/${record.id}.mp4`,
    videoThumbnailUrl: getMockVideoThumbnailUrl(record),
    videoRequestedAt: new Date(requestedAt).toISOString(),
    videoReadyAt: new Date(readyAt).toISOString(),
  };
}

export function reconcileMockVideoGeneration(
  record: AppointmentRecord,
): VideoGenerationReconciliation {
  if (record.videoProvider !== 'mock' || record.videoStatus === 'ready') {
    return { changed: false, record };
  }

  if (Date.now() < new Date(record.videoReadyAt).getTime()) {
    return { changed: false, record };
  }

  return {
    changed: true,
    record: {
      ...record,
      videoStatus: 'ready',
    },
  };
}
