import { getAppointmentRecord } from '../../../lib/appointments';
import {
  previewImageContentType,
  previewImageSize,
  renderAppointmentPreviewImage,
} from '../../../lib/preview-image';

export const size = previewImageSize;
export const contentType = previewImageContentType;
export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ shortId: string }>;

export default async function OpenGraphImage({
  params,
}: {
  params: RouteParams;
}) {
  const { shortId } = await params;
  const record = await getAppointmentRecord(shortId);

  return renderAppointmentPreviewImage(record);
}
