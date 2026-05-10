import { NextResponse } from 'next/server';

import { cacheProvidedVehicleImage, resolveVehicleImage } from '../../../../lib/vehicle-images';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vehicle = searchParams.get('vehicle')?.trim() ?? '';
  const vin = searchParams.get('vin')?.trim() ?? null;
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
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}

export async function POST(request: Request) {
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
  const vehicle = payload.vehicle?.trim() ?? '';
  const imageUrl = payload.imageUrl?.trim() ?? '';
  const provider = payload.provider ?? 'crm-page';

  if (!vehicle || !imageUrl) {
    return NextResponse.json(
      {
        error: 'vehicle and imageUrl are required',
      },
      {
        status: 400,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      },
    );
  }

  const resolved = await cacheProvidedVehicleImage({
    vehicleQuery: vehicle,
    vin: payload.vin ?? null,
    imageUrl,
    provider,
    sourcePageUrl: payload.sourcePageUrl ?? null,
  });

  return NextResponse.json(
    {
      vehicle: resolved?.vehicle ?? vehicle,
      cacheKey: resolved?.cacheKey ?? null,
      bodyStyle: resolved?.bodyStyle ?? null,
      imageUrl: resolved?.imageUrl ?? imageUrl,
      provider,
      sourcePageUrl: payload.sourcePageUrl ?? null,
      usedFallback: false,
    },
    {
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}
