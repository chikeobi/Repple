const MAKES = [
  'Acura',
  'Alfa Romeo',
  'Audi',
  'BMW',
  'Buick',
  'Cadillac',
  'Chevrolet',
  'Chrysler',
  'Dodge',
  'Ford',
  'Genesis',
  'GMC',
  'Honda',
  'Hyundai',
  'Infiniti',
  'Jeep',
  'Kia',
  'Land Rover',
  'Lexus',
  'Lincoln',
  'Mazda',
  'Mercedes-Benz',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Porsche',
  'Ram',
  'Subaru',
  'Tesla',
  'Toyota',
  'Volkswagen',
  'Volvo',
];

const BODY_STYLE_RULES = [
  { bodyStyle: 'sedan', patterns: [/\bsedan\b/i, /\baccord\b/i, /\bcamry\b/i, /\bcivic\b/i] },
  { bodyStyle: 'suv', patterns: [/\bsuv\b/i, /\bcrossover\b/i, /\bcr-v\b/i, /\bpilot\b/i, /\bhighlander\b/i] },
  { bodyStyle: 'truck', patterns: [/\btruck\b/i, /\bf-?150\b/i, /\bsilverado\b/i, /\bram\b/i, /\btacoma\b/i] },
  { bodyStyle: 'coupe', patterns: [/\bcoupe\b/i] },
  { bodyStyle: 'hatchback', patterns: [/\bhatchback\b/i] },
  { bodyStyle: 'wagon', patterns: [/\bwagon\b/i] },
  { bodyStyle: 'van', patterns: [/\bvan\b/i, /\bminivan\b/i] },
  { bodyStyle: 'convertible', patterns: [/\bconvertible\b/i, /\bcabriolet\b/i, /\broadster\b/i] },
] as const;

export type VehicleBodyStyle =
  | 'sedan'
  | 'suv'
  | 'truck'
  | 'coupe'
  | 'hatchback'
  | 'wagon'
  | 'van'
  | 'convertible';

export type VehicleDescriptor = {
  raw: string;
  normalized: string;
  cacheKey: string;
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyStyle: VehicleBodyStyle;
  searchQuery: string;
  heroSearchQuery: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function detectBodyStyle(vehicle: string): VehicleBodyStyle {
  for (const rule of BODY_STYLE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(vehicle))) {
      return rule.bodyStyle;
    }
  }

  return 'sedan';
}

export function parseVehicleDescriptor(vehicle: string): VehicleDescriptor {
  const normalized = normalizeWhitespace(vehicle);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const year = tokens.find((token) => /^(19|20)\d{2}$/.test(token)) ?? null;
  const make =
    MAKES.find((candidate) =>
      normalized.toLowerCase().includes(candidate.toLowerCase()),
    ) ?? null;

  const makeIndex = make
    ? tokens.findIndex((token) => token.toLowerCase() === make.toLowerCase())
    : -1;
  const model =
    makeIndex >= 0 && tokens[makeIndex + 1]
      ? tokens[makeIndex + 1].replace(/[^a-z0-9-]/gi, '')
      : null;
  const trim =
    makeIndex >= 0 && tokens.length > makeIndex + 2
      ? tokens.slice(makeIndex + 2).join(' ')
      : null;
  const bodyStyle = detectBodyStyle(normalized);
  const searchQuery = [year, make, model, trim].filter(Boolean).join(' ') || normalized;
  const heroSearchQuery = [searchQuery, bodyStyle, 'luxury dealership exterior'].join(' ');

  return {
    raw: vehicle,
    normalized,
    cacheKey: slugify(searchQuery || normalized || 'vehicle'),
    year,
    make,
    model,
    trim,
    bodyStyle,
    searchQuery,
    heroSearchQuery,
  };
}

export function buildVehicleImageRenderUrl(vehicle: string, origin: string) {
  const url = new URL('/api/vehicle-image/render', origin.replace(/\/+$/, ''));
  url.searchParams.set('vehicle', normalizeWhitespace(vehicle));
  return url.toString();
}

export function buildVehicleImageResolveUrl(vehicle: string, origin: string) {
  const url = new URL('/api/vehicle-image/resolve', origin.replace(/\/+$/, ''));
  url.searchParams.set('vehicle', normalizeWhitespace(vehicle));
  return url.toString();
}

export function appendVinToVehicleImageUrl(url: string, vin?: string | null) {
  if (!vin?.trim()) {
    return url;
  }

  const nextUrl = new URL(url);
  nextUrl.searchParams.set('vin', vin.trim());
  return nextUrl.toString();
}

function getFallbackShapes(bodyStyle: VehicleBodyStyle) {
  switch (bodyStyle) {
    case 'suv':
      return {
        body: 'M250 446c18-82 72-148 155-192 102-53 300-61 461-18 104 28 198 95 263 210H250Z',
        roof: 'M420 292c63-57 286-73 425-17 67 27 122 76 177 152H377c11-46 20-78 43-135Z',
      };
    case 'truck':
      return {
        body: 'M236 454c28-66 96-129 191-164 90-33 230-41 354-23 80 12 160 44 249 103l104 84H236Z',
        roof: 'M446 310c53-34 159-55 248-55 88 0 152 19 199 64l64 65H450c-5-27-7-48-4-74Z',
      };
    case 'coupe':
      return {
        body: 'M266 470c20-75 72-130 147-169 91-48 259-57 381-26 89 23 163 73 238 195H266Z',
        roof: 'M485 308c74-64 230-76 332-36 62 24 111 67 155 133H443c10-38 18-66 42-97Z',
      };
    default:
      return {
        body: 'M280 462c22-78 67-135 138-172 82-43 251-56 382-22 90 24 171 83 226 194H280Z',
        roof: 'M446 304c57-53 246-71 360-26 54 22 97 62 141 127H408c10-40 18-68 38-101Z',
      };
  }
}

export function buildFallbackVehicleImageSvg(vehicle: string) {
  const descriptor = parseVehicleDescriptor(vehicle);
  const safeVehicle = descriptor.normalized.replace(/[<&>"]/g, '');
  const { body, roof } = getFallbackShapes(descriptor.bodyStyle);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f3f6fb"/>
          <stop offset="40%" stop-color="#dfe7f2"/>
          <stop offset="100%" stop-color="#c9d5e6"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#eef4fb"/>
          <stop offset="100%" stop-color="#c8d7eb"/>
        </linearGradient>
        <linearGradient id="surface" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#d5dce6"/>
          <stop offset="100%" stop-color="#b8c3d2"/>
        </linearGradient>
        <linearGradient id="carBody" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#69778a"/>
          <stop offset="50%" stop-color="#1d2533"/>
          <stop offset="100%" stop-color="#7f8ea4"/>
        </linearGradient>
        <linearGradient id="carRoof" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#364255"/>
          <stop offset="100%" stop-color="#182131"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#bg)"/>
      <rect x="0" y="0" width="395" height="312" fill="#565f6d"/>
      <rect x="0" y="438" width="1200" height="237" fill="url(#surface)"/>
      <rect x="316" y="56" width="344" height="246" fill="url(#glass)"/>
      <ellipse cx="672" cy="548" rx="304" ry="34" fill="rgba(15,23,42,0.18)"/>
      <path d="${body}" fill="url(#carBody)"/>
      <path d="${roof}" fill="url(#carRoof)"/>
      <path d="M490 314h173c51 0 82 30 108 90H454c9-34 18-60 36-90Z" fill="#d8e4f3"/>
      <path d="M762 314h83c43 0 79 26 113 90H789c-8-31-16-56-27-90Z" fill="#c2d0e0"/>
      <rect x="452" y="403" width="260" height="56" rx="24" fill="#131b29"/>
      <rect x="748" y="402" width="166" height="54" rx="22" fill="#131b29"/>
      <rect x="319" y="416" width="82" height="13" rx="7" fill="#eef4fb"/>
      <rect x="889" y="415" width="88" height="13" rx="7" fill="#eef4fb"/>
      <circle cx="440" cy="470" r="60" fill="#0b1220"/>
      <circle cx="440" cy="470" r="27" fill="#aeb8c7"/>
      <circle cx="851" cy="470" r="60" fill="#0b1220"/>
      <circle cx="851" cy="470" r="27" fill="#aeb8c7"/>
      <rect x="54" y="548" width="298" height="70" rx="16" fill="rgba(17,24,39,0.68)"/>
      <text x="84" y="591" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="22">Premium arrival details</text>
      <rect x="855" y="52" width="278" height="46" rx="23" fill="rgba(255,255,255,0.88)"/>
      <text x="888" y="81" fill="#576277" font-family="Arial, Helvetica, sans-serif" font-size="18">${safeVehicle}</text>
    </svg>
  `;
}

export function buildFallbackVehicleImageDataUrl(vehicle: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildFallbackVehicleImageSvg(vehicle))}`;
}
