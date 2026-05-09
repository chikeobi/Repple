export type VideoGenerationStatus = 'processing' | 'ready';

export type AppointmentRecord = {
  id: string;
  firstName: string;
  vehicle: string;
  appointmentTime: string;
  salespersonName: string;
  dealershipName: string;
  dealershipAddress: string;
  landingPageUrl: string;
  previewImageUrl: string;
  smsText: string;
  videoProvider: 'mock';
  videoStatus: VideoGenerationStatus;
  videoJobId: string;
  videoUrl: string;
  videoThumbnailUrl: string;
  videoRequestedAt: string;
  videoReadyAt: string;
  createdAt: string;
};

export type SupabaseAppointmentRow = {
  generated_id: string | null;
  customer_name: string | null;
  vehicle: string | null;
  appointment_time: string | null;
  salesperson_name: string | null;
  dealership_name: string | null;
  address: string | null;
  created_at: string | null;
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://repple.ai').replace(
  /\/+$/,
  '',
);
const SHORT_ID_PATTERN = /^[A-Z0-9]{5,7}$/;

export function normalizeAppointmentId(id: string) {
  return id.trim().toUpperCase();
}

export function isValidAppointmentId(id: string) {
  return SHORT_ID_PATTERN.test(normalizeAppointmentId(id));
}

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
      <rect x="0" y="0" width="380" height="300" fill="#49586d"/>
      <rect x="90" y="105" width="92" height="118" rx="6" fill="#1f2937"/>
      <rect x="98" y="112" width="76" height="102" rx="4" fill="#f6f9fc"/>
      <rect x="338" y="62" width="302" height="236" fill="#374151"/>
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

export function buildPublicLandingPageUrl(id: string) {
  const normalizedId = normalizeAppointmentId(id);

  return `${SITE_URL}/r/${encodeURIComponent(normalizedId)}`;
}

export function buildPreviewImageUrl(id: string) {
  const normalizedId = normalizeAppointmentId(id);

  return `${SITE_URL}/r/${encodeURIComponent(normalizedId)}/preview-image`;
}

function buildSmsLead(record: Pick<
  AppointmentRecord,
  'vehicle' | 'appointmentTime' | 'salespersonName'
>) {
  return `${record.salespersonName} recorded a quick video for you before your visit ${record.appointmentTime}. Your ${record.vehicle} is reserved and ready.`;
}

export function buildSmsText(record: Pick<
  AppointmentRecord,
  'firstName' | 'vehicle' | 'appointmentTime' | 'salespersonName' | 'landingPageUrl'
>) {
  return `Hey ${record.firstName}, ${buildSmsLead(record)} ${record.landingPageUrl}`;
}

export function buildMetaDescription(record: Pick<
  AppointmentRecord,
  'vehicle' | 'appointmentTime' | 'salespersonName'
>) {
  return `${record.salespersonName} recorded a quick video before your ${record.appointmentTime} visit. Your ${record.vehicle} is reserved and ready.`;
}

export function normalizeSupabaseRow(row: SupabaseAppointmentRow | null | undefined) {
  if (
    !row?.generated_id ||
    !row.customer_name ||
    !row.vehicle ||
    !row.appointment_time ||
    !row.salesperson_name ||
    !row.dealership_name ||
    !row.address ||
    !row.created_at
  ) {
    return null;
  }

  const normalizedId = normalizeAppointmentId(row.generated_id);

  if (!isValidAppointmentId(normalizedId)) {
    return null;
  }

  return {
    generated_id: normalizedId,
    customer_name: row.customer_name,
    vehicle: row.vehicle,
    appointment_time: row.appointment_time,
    salesperson_name: row.salesperson_name,
    dealership_name: row.dealership_name,
    address: row.address,
    created_at: row.created_at,
  };
}

export function hydrateAppointmentRecord(row: NonNullable<ReturnType<typeof normalizeSupabaseRow>>) {
  const id = normalizeAppointmentId(row.generated_id);
  const createdAt = row.created_at;
  const requestedAt = new Date(createdAt).getTime();
  const readyAt = requestedAt + getMockVideoDelayMs(id);
  const landingPageUrl = buildPublicLandingPageUrl(id);

  const record: AppointmentRecord = {
    id,
    firstName: row.customer_name.trim(),
    vehicle: row.vehicle.trim(),
    appointmentTime: row.appointment_time.trim(),
    salespersonName: row.salesperson_name.trim(),
    dealershipName: row.dealership_name.trim(),
    dealershipAddress: row.address.trim(),
    landingPageUrl,
    previewImageUrl: buildPreviewImageUrl(id),
    smsText: '',
    videoProvider: 'mock',
    videoStatus: Date.now() >= readyAt ? 'ready' : 'processing',
    videoJobId: `mock_video_${id}`,
    videoUrl: `https://example.com/repple/mock-video/${id}.mp4`,
    videoThumbnailUrl: getMockVideoThumbnailUrl({
      firstName: row.customer_name.trim(),
      vehicle: row.vehicle.trim(),
    } as Pick<AppointmentRecord, 'firstName' | 'vehicle'>),
    videoRequestedAt: new Date(requestedAt).toISOString(),
    videoReadyAt: new Date(readyAt).toISOString(),
    createdAt,
  };

  return {
    ...record,
    smsText: buildSmsText(record),
  };
}
