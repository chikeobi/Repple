import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getSiteUrl } from '../lib/env';
import './globals.css';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Repple',
  description: 'Personalized appointment pages for dealership customers.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
