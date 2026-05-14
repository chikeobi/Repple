import { getAppointmentRecord } from '../../../../lib/appointments';
import { renderAppointmentPreviewImage } from '../../../../lib/preview-image';
import { buildFallbackVehicleImageDataUrl, resolveVehicleImage } from '../../../../lib/vehicle-images';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ shortId: string }>;

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: RouteParams;
  },
) {
  let response: Response;

  try {
    const { shortId } = await params;
    const record = await getAppointmentRecord(shortId);
    const resolvedImage =
      record && !record.vehicleImageUrl ? await resolveVehicleImage(record.vehicle) : null;

    response = renderAppointmentPreviewImage(
      record
        ? {
            ...record,
            vehicleImageUrl:
              record.vehicleImageUrl ??
              resolvedImage?.imageUrl ??
              buildFallbackVehicleImageDataUrl(record.vehicle),
          }
        : record,
    );
  } catch {
    response = renderAppointmentPreviewImage(null);
  }

  response.headers.set(
    'cache-control',
    'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  );

  return response;
}
