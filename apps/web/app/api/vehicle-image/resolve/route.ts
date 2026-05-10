import { NextResponse } from 'next/server';

import { resolveVehicleImage } from '../../../../lib/vehicle-images';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vehicle = searchParams.get('vehicle')?.trim() ?? '';
  const resolved = await resolveVehicleImage(vehicle);

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

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}
