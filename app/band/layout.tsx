// app/band/layout.tsx
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'THE BAND — Musician Songbook & Stage Tool',
  description: 'Live chord transposer, setlist lineup, ambient worship pads, and in-ear audio playback for church musicians.',
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
