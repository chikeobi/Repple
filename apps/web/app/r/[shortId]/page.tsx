import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getAppointmentRecord } from '../../../lib/appointments';
import { buildMetaDescription, buildPreviewImageUrl } from '../../../lib/repple';
import { AppointmentCard } from './appointment-card';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ shortId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { shortId } = await params;
  const record = await getAppointmentRecord(shortId);

  if (!record) {
    return {
      title: 'Repple',
      description: 'Personalized appointment pages for dealership customers.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${record.firstName}, your vehicle is reserved.`;
  const description = buildMetaDescription(record);
  const imageUrl = buildPreviewImageUrl(record.id);

  return {
    title,
    description,
    alternates: {
      canonical: record.landingPageUrl,
    },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description,
      url: record.landingPageUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${record.vehicle} appointment preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PublicAppointmentPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: SearchParams;
}) {
  const { shortId } = await params;
  const resolvedSearchParams = await searchParams;
  const record = await getAppointmentRecord(shortId);

  if (!record) {
    notFound();
  }

  const embedValue = resolvedSearchParams.embed;
  const embed =
    embedValue === '1' ||
    embedValue === 'true' ||
    (Array.isArray(embedValue) && embedValue.includes('1'));

  return <AppointmentCard embed={embed} initialRecord={record} />;
}
