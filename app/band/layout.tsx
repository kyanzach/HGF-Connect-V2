// app/band/layout.tsx
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'HGF Worship Team Setlist & Chords',
  description:
    'Official worship team companion app for House of Grace Fellowship. Real-time setlist sync, live chord transposer, ambient worship pads, and audio track playback.',
  manifest: '/manifest-band.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-32x32.png',
    apple: '/icons/icon-180.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HGF Worship',
  },
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    url: 'https://connect.houseofgrace.ph/band',
    siteName: 'HGF Worship Team Setlist & Chords',
    title: 'HGF Worship Team Setlist & Chords',
    description:
      'Official worship team companion app for House of Grace Fellowship. Real-time setlist sync, live chord transposer, ambient worship pads, and audio track playback.',
    images: [
      {
        url: 'https://connect.houseofgrace.ph/og-band.png',
        width: 1200,
        height: 630,
        alt: 'HGF Worship Team Setlist & Chords',
      },
      {
        url: 'https://connect.houseofgrace.ph/og-band-square.png',
        width: 800,
        height: 800,
        alt: 'HGF Worship Team Setlist & Chords (Square)',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HGF Worship Team Setlist & Chords',
    description:
      'Official worship team companion app for House of Grace Fellowship. Real-time setlist sync, chord transposer, ambient worship pads, and audio playback.',
    images: ['https://connect.houseofgrace.ph/og-band.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0d14',
};

export default function BandLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: '#0a0d14',
        minHeight: '100vh',
        width: '100vw',
        overflow: 'hidden',
        color: '#f8fafc',
      }}
    >
      {children}
    </div>
  );
}
