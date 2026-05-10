import { createClient } from '@supabase/supabase-js';

import {
  buildFallbackVehicleImageDataUrl,
  buildFallbackVehicleImageSvg,
  parseVehicleDescriptor,
  type VehicleBodyStyle,
} from './shared/vehicle-images';
import { getSupabasePublicEnv } from './env';

const VEHICLE_IMAGE_CACHE_TABLE = 'repple_vehicle_image_cache';
const VEHICLE_IMAGE_PROVIDER_URL_TEMPLATE =
  process.env.VEHICLE_IMAGE_PROVIDER_URL_TEMPLATE?.trim() || null;
const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : null;

type VehicleImageCacheRow = {
  cache_key: string;
  vehicle_query: string;
  body_style: string | null;
  provider: string;
  image_url: string;
  source_page_url: string | null;
  created_at?: string | null;
};

type DecodedVin = {
  vin: string;
  make: string | null;
  model: string | null;
  year: string | null;
  bodyStyle: VehicleBodyStyle | null;
};

export type ResolvedVehicleImage = {
  cacheKey: string;
  vehicle: string;
  bodyStyle: VehicleBodyStyle;
  imageUrl: string | null;
  provider:
    | 'crm-page'
    | 'inventory-page'
    | 'vin-lookup'
    | 'external-api'
    | 'fallback';
  sourcePageUrl: string | null;
  fallbackSvg: string | null;
};

function buildVehicleImageCacheKey(vehicleQuery: string, vin?: string | null) {
  const normalizedVin = vin?.trim().toUpperCase() ?? '';

  if (normalizedVin) {
    return `vin:${normalizedVin}`;
  }

  return parseVehicleDescriptor(vehicleQuery).cacheKey;
}

function normalizeRemoteImageUrl(url: string) {
  try {
    const imageUrl = new URL(url);
    if (!imageUrl.searchParams.has('w')) {
      imageUrl.searchParams.set('w', '1200');
    }
    if (!imageUrl.searchParams.has('h')) {
      imageUrl.searchParams.set('h', '675');
    }
    if (!imageUrl.searchParams.has('fit')) {
      imageUrl.searchParams.set('fit', 'crop');
    }

    return imageUrl.toString();
  } catch {
    return url;
  }
}

async function readCachedVehicleImage(cacheKey: string) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(VEHICLE_IMAGE_CACHE_TABLE)
    .select('cache_key, vehicle_query, body_style, provider, image_url, source_page_url, created_at')
    .eq('cache_key', cacheKey)
    .maybeSingle();

  if (error || !data?.image_url) {
    return null;
  }

  return data as VehicleImageCacheRow;
}

async function cacheVehicleImage(row: VehicleImageCacheRow) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from(VEHICLE_IMAGE_CACHE_TABLE).insert(row);

  if (error && error.code !== '23505') {
    console.error('Unable to cache vehicle image', error.message);
  }
}

export async function cacheProvidedVehicleImage(input: {
  vehicleQuery: string;
  vin?: string | null;
  imageUrl: string;
  provider: ResolvedVehicleImage['provider'];
  sourcePageUrl?: string | null;
}) {
  const descriptor = parseVehicleDescriptor(input.vehicleQuery);
  const cacheKey = buildVehicleImageCacheKey(input.vehicleQuery, input.vin);

  if (!descriptor.normalized || !input.imageUrl) {
    return null;
  }

  const imageUrl = normalizeRemoteImageUrl(input.imageUrl);

  await cacheVehicleImage({
    cache_key: buildVehicleImageCacheKey(input.vehicleQuery, input.vin),
    vehicle_query: descriptor.normalized,
    body_style: descriptor.bodyStyle,
    provider: input.provider,
    image_url: imageUrl,
    source_page_url: input.sourcePageUrl ?? null,
  });

  return {
    cacheKey,
    vehicle: descriptor.normalized,
    bodyStyle: descriptor.bodyStyle,
    imageUrl,
    provider: input.provider,
    sourcePageUrl: input.sourcePageUrl ?? null,
    fallbackSvg: null,
  } satisfies ResolvedVehicleImage;
}

function inferBodyStyleFromText(value: string | null | undefined) {
  const haystack = value?.toLowerCase() ?? '';

  if (!haystack) {
    return null;
  }

  if (/\btruck|pickup\b/.test(haystack)) {
    return 'truck';
  }
  if (/\bsuv|crossover\b/.test(haystack)) {
    return 'suv';
  }
  if (/\bcoupe\b/.test(haystack)) {
    return 'coupe';
  }
  if (/\bhatchback\b/.test(haystack)) {
    return 'hatchback';
  }
  if (/\bwagon\b/.test(haystack)) {
    return 'wagon';
  }
  if (/\bvan|minivan\b/.test(haystack)) {
    return 'van';
  }
  if (/\bconvertible|cabriolet|roadster\b/.test(haystack)) {
    return 'convertible';
  }
  if (/\bsedan\b/.test(haystack)) {
    return 'sedan';
  }

  return null;
}

async function decodeVin(vin: string): Promise<DecodedVin | null> {
  const normalizedVin = vin.trim().toUpperCase();

  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalizedVin)) {
    return null;
  }

  const response = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(normalizedVin)}?format=json`,
    {
      next: {
        revalidate: 60 * 60 * 24 * 14,
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    Results?: Array<{
      Make?: string;
      Model?: string;
      ModelYear?: string;
      BodyClass?: string;
    }>;
  };
  const result = payload.Results?.[0];

  if (!result) {
    return null;
  }

  return {
    vin: normalizedVin,
    make: result.Make?.trim() || null,
    model: result.Model?.trim() || null,
    year: result.ModelYear?.trim() || null,
    bodyStyle: inferBodyStyleFromText(result.BodyClass),
  };
}

function buildExternalVehicleProviderUrl(input: {
  vehicleQuery: string;
  vin?: string | null;
  decodedVin?: DecodedVin | null;
}) {
  if (!VEHICLE_IMAGE_PROVIDER_URL_TEMPLATE) {
    return null;
  }

  const descriptor = parseVehicleDescriptor(input.vehicleQuery);
  const make = input.decodedVin?.make ?? descriptor.make;
  const model = input.decodedVin?.model ?? descriptor.model;
  const year = input.decodedVin?.year ?? descriptor.year;
  const bodyStyle = input.decodedVin?.bodyStyle ?? descriptor.bodyStyle;
  const trim = descriptor.trim ?? '';

  if (!make || !model || !year) {
    return null;
  }

  const replacements: Record<string, string> = {
    '{vin}': encodeURIComponent(input.vin?.trim() ?? ''),
    '{year}': encodeURIComponent(year),
    '{make}': encodeURIComponent(make),
    '{model}': encodeURIComponent(model),
    '{trim}': encodeURIComponent(trim),
    '{bodyStyle}': encodeURIComponent(bodyStyle),
    '{vehicle}': encodeURIComponent(descriptor.normalized),
  };

  let resolved = VEHICLE_IMAGE_PROVIDER_URL_TEMPLATE;

  for (const [key, value] of Object.entries(replacements)) {
    resolved = resolved.split(key).join(value);
  }

  try {
    return new URL(resolved).toString();
  } catch {
    return null;
  }
}

async function validateVehicleProviderImage(url: string) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      next: {
        revalidate: 60 * 60 * 24,
      },
    });

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok || !contentType.startsWith('image/')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function fetchExternalVehicleImage(
  vehicleQuery: string,
  vin?: string | null,
) {
  const decodedVin = vin ? await decodeVin(vin) : null;
  const url = buildExternalVehicleProviderUrl({
    vehicleQuery,
    vin,
    decodedVin,
  });

  if (!url) {
    return null;
  }

  const isValid = await validateVehicleProviderImage(url);

  if (!isValid) {
    return null;
  }

  return {
    bodyStyle: decodedVin?.bodyStyle ?? parseVehicleDescriptor(vehicleQuery).bodyStyle,
    imageUrl: normalizeRemoteImageUrl(url),
    provider: decodedVin ? ('vin-lookup' as const) : ('external-api' as const),
    sourcePageUrl: null,
  };
}

export async function resolveVehicleImage(
  vehicleQuery: string,
  options?: { vin?: string | null },
): Promise<ResolvedVehicleImage> {
  const descriptor = parseVehicleDescriptor(vehicleQuery);

  if (!descriptor.normalized) {
    return {
      cacheKey: buildVehicleImageCacheKey(vehicleQuery, options?.vin ?? null),
      vehicle: descriptor.normalized,
      bodyStyle: descriptor.bodyStyle,
      imageUrl: null,
      provider: 'fallback',
      sourcePageUrl: null,
      fallbackSvg: buildFallbackVehicleImageSvg(vehicleQuery),
    };
  }

  const cacheKey = buildVehicleImageCacheKey(vehicleQuery, options?.vin ?? null);
  const cached = await readCachedVehicleImage(cacheKey);

  if (cached?.image_url) {
    return {
      cacheKey,
      vehicle: descriptor.normalized,
      bodyStyle: descriptor.bodyStyle,
      imageUrl: cached.image_url,
      provider:
        cached.provider === 'crm-page' ||
        cached.provider === 'inventory-page' ||
        cached.provider === 'vin-lookup' ||
        cached.provider === 'external-api'
          ? cached.provider
          : 'fallback',
      sourcePageUrl: cached.source_page_url,
      fallbackSvg: null,
    };
  }

  const resolved = await fetchExternalVehicleImage(descriptor.normalized, options?.vin ?? null);

  if (resolved?.imageUrl) {
    void cacheVehicleImage({
      cache_key: cacheKey,
      vehicle_query: descriptor.normalized,
      body_style: resolved.bodyStyle,
      provider: resolved.provider,
      image_url: resolved.imageUrl,
      source_page_url: resolved.sourcePageUrl,
    });

    return {
      cacheKey,
      vehicle: descriptor.normalized,
      bodyStyle: resolved.bodyStyle,
      imageUrl: resolved.imageUrl,
      provider: resolved.provider,
      sourcePageUrl: resolved.sourcePageUrl,
      fallbackSvg: null,
    };
  }

  return {
    cacheKey,
    vehicle: descriptor.normalized,
    bodyStyle: descriptor.bodyStyle,
    imageUrl: null,
    provider: 'fallback',
    sourcePageUrl: null,
    fallbackSvg: buildFallbackVehicleImageSvg(descriptor.normalized),
  };
}

export { buildFallbackVehicleImageDataUrl };
