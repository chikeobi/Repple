import { createClient } from '@supabase/supabase-js';

import {
  buildFallbackVehicleImageDataUrl,
  buildFallbackVehicleImageSvg,
  parseVehicleDescriptor,
  type VehicleBodyStyle,
} from './shared/vehicle-images';
import { getSupabasePublicEnv } from './env';

const VEHICLE_IMAGE_CACHE_TABLE = 'repple_vehicle_image_cache';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY?.trim() || null;
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

type UnsplashPhoto = {
  alt_description?: string | null;
  description?: string | null;
  urls?: {
    regular?: string | null;
  } | null;
  links?: {
    html?: string | null;
  } | null;
};

export type ResolvedVehicleImage = {
  cacheKey: string;
  vehicle: string;
  bodyStyle: VehicleBodyStyle;
  imageUrl: string | null;
  provider: 'unsplash' | 'fallback';
  sourcePageUrl: string | null;
  fallbackSvg: string | null;
};

function buildUnsplashHotlinkUrl(url: string) {
  try {
    const imageUrl = new URL(url);
    imageUrl.searchParams.set('auto', 'format');
    imageUrl.searchParams.set('fit', 'crop');
    imageUrl.searchParams.set('crop', 'entropy');
    imageUrl.searchParams.set('q', '80');
    imageUrl.searchParams.set('w', '1200');
    imageUrl.searchParams.set('h', '675');

    return imageUrl.toString();
  } catch {
    return url;
  }
}

function scoreUnsplashPhoto(
  photo: UnsplashPhoto,
  vehicle: ReturnType<typeof parseVehicleDescriptor>,
) {
  const haystack = `${photo.description || ''} ${photo.alt_description || ''}`.toLowerCase();
  let score = 0;

  if (vehicle.make && haystack.includes(vehicle.make.toLowerCase())) {
    score += 25;
  }

  if (vehicle.model && haystack.includes(vehicle.model.toLowerCase())) {
    score += 30;
  }

  if (vehicle.bodyStyle && haystack.includes(vehicle.bodyStyle)) {
    score += 12;
  }

  if (/\bcar\b|\bvehicle\b|\bautomobile\b/.test(haystack)) {
    score += 8;
  }

  if (/\bblack\b|\bdark\b|\bluxury\b|\bdriveway\b|\bgarage\b/.test(haystack)) {
    score += 4;
  }

  return score;
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

async function fetchUnsplashVehicleImage(vehicleQuery: string) {
  if (!UNSPLASH_ACCESS_KEY) {
    return null;
  }

  const descriptor = parseVehicleDescriptor(vehicleQuery);
  const searchUrl = new URL('https://api.unsplash.com/search/photos');
  searchUrl.searchParams.set('query', descriptor.heroSearchQuery);
  searchUrl.searchParams.set('per_page', '12');
  searchUrl.searchParams.set('page', '1');
  searchUrl.searchParams.set('order_by', 'relevant');
  searchUrl.searchParams.set('content_filter', 'high');
  searchUrl.searchParams.set('orientation', 'landscape');

  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      'Accept-Version': 'v1',
    },
    next: {
      revalidate: 60 * 60 * 24,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { results?: UnsplashPhoto[] };
  const results = payload.results ?? [];

  if (results.length === 0) {
    return null;
  }

  const bestPhoto = [...results].sort(
    (left, right) => scoreUnsplashPhoto(right, descriptor) - scoreUnsplashPhoto(left, descriptor),
  )[0];
  const regularUrl = bestPhoto?.urls?.regular;

  if (!regularUrl) {
    return null;
  }

  return {
    bodyStyle: descriptor.bodyStyle,
    imageUrl: buildUnsplashHotlinkUrl(regularUrl),
    provider: 'unsplash' as const,
    sourcePageUrl: bestPhoto.links?.html ?? null,
  };
}

export async function resolveVehicleImage(vehicleQuery: string): Promise<ResolvedVehicleImage> {
  const descriptor = parseVehicleDescriptor(vehicleQuery);

  if (!descriptor.normalized) {
    return {
      cacheKey: descriptor.cacheKey,
      vehicle: descriptor.normalized,
      bodyStyle: descriptor.bodyStyle,
      imageUrl: null,
      provider: 'fallback',
      sourcePageUrl: null,
      fallbackSvg: buildFallbackVehicleImageSvg(vehicleQuery),
    };
  }

  const cached = await readCachedVehicleImage(descriptor.cacheKey);

  if (cached?.image_url) {
    return {
      cacheKey: descriptor.cacheKey,
      vehicle: descriptor.normalized,
      bodyStyle: descriptor.bodyStyle,
      imageUrl: cached.image_url,
      provider: cached.provider === 'unsplash' ? 'unsplash' : 'fallback',
      sourcePageUrl: cached.source_page_url,
      fallbackSvg: null,
    };
  }

  const resolved = await fetchUnsplashVehicleImage(descriptor.normalized);

  if (resolved?.imageUrl) {
    void cacheVehicleImage({
      cache_key: descriptor.cacheKey,
      vehicle_query: descriptor.normalized,
      body_style: resolved.bodyStyle,
      provider: resolved.provider,
      image_url: resolved.imageUrl,
      source_page_url: resolved.sourcePageUrl,
    });

    return {
      cacheKey: descriptor.cacheKey,
      vehicle: descriptor.normalized,
      bodyStyle: resolved.bodyStyle,
      imageUrl: resolved.imageUrl,
      provider: resolved.provider,
      sourcePageUrl: resolved.sourcePageUrl,
      fallbackSvg: null,
    };
  }

  return {
    cacheKey: descriptor.cacheKey,
    vehicle: descriptor.normalized,
    bodyStyle: descriptor.bodyStyle,
    imageUrl: null,
    provider: 'fallback',
    sourcePageUrl: null,
    fallbackSvg: buildFallbackVehicleImageSvg(descriptor.normalized),
  };
}

export { buildFallbackVehicleImageDataUrl };
