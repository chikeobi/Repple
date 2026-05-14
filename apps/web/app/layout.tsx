import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getSiteUrl } from '../lib/env';
import './globals.css';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Repple',
  description:
    'Repple helps dealership reps create personalized appointment cards from CRM data and paste them into existing CRM texting.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Repple',
    title: 'Repple',
    description:
      'Repple helps dealership reps create personalized appointment cards from CRM data and paste them into existing CRM texting.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
