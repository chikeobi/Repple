import { NextResponse } from 'next/server';

import { resolveVehicleImage } from '../../../../lib/vehicle-images';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vehicle = searchParams.get('vehicle')?.trim() ?? '';
  const resolved = await resolveVehicleImage(vehicle);

  if (resolved.imageUrl) {
    const response = NextResponse.redirect(resolved.imageUrl, 307);
    response.headers.set(
      'cache-control',
      'public, max-age=1800, s-maxage=86400, stale-while-revalidate=604800',
    );
    return response;
  }

  return new Response(resolved.fallbackSvg ?? '', {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=1800, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
