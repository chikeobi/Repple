import { NextResponse } from 'next/server';

import { sanitizeSingleLineText } from '../../../../../../shared/sanitization';
import { getSiteUrl } from '../../../../lib/env';
import { cacheProvidedVehicleImage, resolveVehicleImage } from '../../../../lib/vehicle-images';

export const dynamic = 'force-dynamic';

const SITE_ORIGIN = new URL(getSiteUrl()).origin;

function resolveCorsOrigin(request: Request) {
  const origin = request.headers.get('origin')?.trim() ?? '';

  if (!origin) {
    return null;
  }

  if (origin === SITE_ORIGIN || origin.startsWith('chrome-extension://')) {
    return origin;
  }

  return null;
}

function buildCorsHeaders(request: Request, methods: string) {
  const allowedOrigin = resolveCorsOrigin(request);

  return {
    ...(allowedOrigin ? { 'access-control-allow-origin': allowedOrigin } : {}),
    'access-control-allow-methods': methods,
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };
}

function normalizeVin(value: string | null | undefined) {
  const normalizedVin = value?.trim().toUpperCase() ?? '';

  if (!normalizedVin) {
    return null;
  }

  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalizedVin) ? normalizedVin : null;
}

function isPrivateHostname(hostname: string) {
  const normalizedHostname = hostname.trim().toLowerCase();

  if (!normalizedHostname) {
    return true;
  }

  if (normalizedHostname === 'localhost' || normalizedHostname.endsWith('.localhost')) {
    return true;
  }

  if (
    normalizedHostname === '127.0.0.1' ||
    normalizedHostname === '0.0.0.0' ||
    normalizedHostname === '::1'
  ) {
    return true;
  }

  if (/^10\.\d+\.\d+\.\d+$/.test(normalizedHostname)) {
    return true;
  }

  if (/^192\.168\.\d+\.\d+$/.test(normalizedHostname)) {
    return true;
  }

  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(normalizedHostname)) {
    return true;
  }

  return false;
}

function normalizeHttpUrl(
  value: string | null | undefined,
  options?: { allowPrivateHostname?: boolean },
) {
  const trimmedValue = value?.trim() ?? '';

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }

    if (
      options?.allowPrivateHostname !== true &&
      process.env.NODE_ENV === 'production' &&
      isPrivateHostname(url.hostname)
    ) {
      return null;
    }

    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeProvider(value: unknown) {
  return value === 'crm-page' ||
    value === 'inventory-page' ||
    value === 'vin-lookup' ||
    value === 'external-api'
    ? value
    : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vehicle = sanitizeSingleLineText(searchParams.get('vehicle') ?? '', 120);
  const vin = normalizeVin(searchParams.get('vin'));
  const resolved = await resolveVehicleImage(vehicle, { vin });

  return NextResponse.json(
    {
      vehicle: resolved.vehicle,
      cacheKey: resolved.cacheKey,
      bodyStyle: resolved.bodyStyle,
      imageUrl: resolved.imageUrl,
      provider: resolved.provider,
      sourcePageUrl: resolved.sourcePageUrl,
      usedFallback: resolved.provider === 'fallback',
    },
    {
      headers: {
        ...buildCorsHeaders(request, 'GET, OPTIONS'),
        'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}

export async function POST(request: Request) {
  if (!resolveCorsOrigin(request)) {
    return NextResponse.json(
      {
        error: 'This endpoint only accepts requests from the Repple app or extension.',
      },
      {
        status: 403,
        headers: buildCorsHeaders(request, 'GET, POST, OPTIONS'),
      },
    );
  }

  const payload = (await request.json()) as {
    vehicle?: string;
    vin?: string | null;
    imageUrl?: string;
    provider?:
      | 'crm-page'
      | 'inventory-page'
      | 'vin-lookup'
      | 'external-api'
      | 'fallback';
    sourcePageUrl?: string | null;
  };
  const vehicle = sanitizeSingleLineText(payload.vehicle ?? '', 120);
  const imageUrl = normalizeHttpUrl(payload.imageUrl);
  const provider = normalizeProvider(payload.provider);
  const sourcePageUrl = normalizeHttpUrl(payload.sourcePageUrl, {
    allowPrivateHostname: process.env.NODE_ENV !== 'production',
  });
  const vin = normalizeVin(payload.vin);

  if (!vehicle || !imageUrl || !provider) {
    return NextResponse.json(
      {
        error: 'vehicle, imageUrl, and a supported provider are required',
      },
      {
        status: 400,
        headers: buildCorsHeaders(request, 'GET, POST, OPTIONS'),
      },
    );
  }

  const resolved = await cacheProvidedVehicleImage({
    vehicleQuery: vehicle,
    vin,
    imageUrl,
    provider,
    sourcePageUrl,
  });

  return NextResponse.json(
    {
      vehicle: resolved?.vehicle ?? vehicle,
      cacheKey: resolved?.cacheKey ?? null,
      bodyStyle: resolved?.bodyStyle ?? null,
      imageUrl: resolved?.imageUrl ?? imageUrl,
      provider,
      sourcePageUrl,
      usedFallback: false,
    },
    {
      headers: {
        ...buildCorsHeaders(request, 'GET, POST, OPTIONS'),
        'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    headers: buildCorsHeaders(request, 'GET, POST, OPTIONS'),
  });
}
