import { getAppointmentRecord } from '../../../../lib/appointments';
import { renderAppointmentPreviewImage } from '../../../../lib/preview-image';

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
  const { shortId } = await params;
  const record = await getAppointmentRecord(shortId);
  const response = renderAppointmentPreviewImage(record);

  response.headers.set(
    'cache-control',
    'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  );

  return response;
}
