import type { AppointmentRecord } from './types';

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

function getMockVideoThumbnailUrl(record: Pick<AppointmentRecord, 'firstName' | 'vehicle'>) {
  const safeName = record.firstName.replace(/[<&>"]/g, '');
  const safeVehicle = record.vehicle.replace(/[<&>"]/g, '');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f3f6fb"/>
          <stop offset="45%" stop-color="#d8e0eb"/>
          <stop offset="100%" stop-color="#c2ccd9"/>
        </linearGradient>
        <linearGradient id="driveway" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#d7dbe2"/>
          <stop offset="100%" stop-color="#b7bfc9"/>
        </linearGradient>
        <linearGradient id="car" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#2b3441"/>
          <stop offset="55%" stop-color="#121925"/>
          <stop offset="100%" stop-color="#3a4452"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#bg)"/>
      <rect x="0" y="0" width="380" height="300" fill="#6b5b50"/>
      <rect x="90" y="105" width="92" height="118" rx="6" fill="#251d1b"/>
      <rect x="98" y="112" width="76" height="102" rx="4" fill="#d8a86d"/>
      <rect x="338" y="62" width="302" height="236" fill="#343e4b"/>
      <rect x="0" y="430" width="1200" height="245" fill="url(#driveway)"/>
      <ellipse cx="670" cy="548" rx="300" ry="34" fill="rgba(15,23,42,0.18)"/>
      <path d="M282 458c26-74 68-128 122-158 74-40 247-58 382-27 90 20 176 79 240 185H282Z" fill="url(#car)"/>
      <path d="M446 301c54-52 249-72 366-24 46 20 84 54 128 118H412c10-36 17-60 34-94Z" fill="#253241"/>
      <path d="M485 312h163c47 0 75 24 98 83H454c8-31 15-53 31-83Z" fill="#0f1728"/>
      <path d="M753 312h84c41 0 77 20 112 83H783c-7-30-15-54-30-83Z" fill="#162032"/>
      <rect x="455" y="396" width="255" height="58" rx="23" fill="#0d1522"/>
      <rect x="750" y="396" width="155" height="55" rx="20" fill="#0d1522"/>
      <rect x="318" y="415" width="77" height="14" rx="7" fill="#eff4fb"/>
      <rect x="884" y="414" width="94" height="14" rx="7" fill="#eff4fb"/>
      <circle cx="440" cy="470" r="60" fill="#0b1220"/>
      <circle cx="440" cy="470" r="27" fill="#aeb8c7"/>
      <circle cx="851" cy="470" r="60" fill="#0b1220"/>
      <circle cx="851" cy="470" r="27" fill="#aeb8c7"/>
      <rect x="56" y="550" width="356" height="78" rx="18" fill="rgba(17,24,39,0.72)"/>
      <text x="88" y="598" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="24">A personal message for ${safeName}</text>
      <rect x="868" y="50" width="252" height="48" rx="24" fill="rgba(255,255,255,0.88)"/>
      <text x="902" y="81" fill="#5b657a" font-family="Arial, Helvetica, sans-serif" font-size="18">${safeVehicle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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

export function startMockVideoGeneration(
  record: BaseAppointmentRecord,
): AppointmentRecord {
  return hydrateMockVideoGeneration(record);
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
