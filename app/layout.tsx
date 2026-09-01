import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://ioannisbekas.github.io/everywatch-market-dashboard/';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'EveryWatch Secondary Market Pulse',
  description:
    'An interactive EveryWatch research dashboard exploring 300 synthetic luxury-watch secondary-market records.',
  openGraph: {
    title: 'EveryWatch Secondary Market Pulse',
    description: 'Global watch-market intelligence across brand, channel, region, and status.',
    type: 'website',
    url: siteUrl,
    images: [
      {
        url: `${siteUrl}og.png`,
        width: 1200,
        height: 630,
        alt: 'EveryWatch market intelligence visualization',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EveryWatch Secondary Market Pulse',
    description: 'Global watch-market intelligence across brand, channel, region, and status.',
    images: [`${siteUrl}og.png`],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
