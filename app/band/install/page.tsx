// app/band/install/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function BandInstallPage() {
  const [platform, setPlatform] = useState<'android' | 'apple'>('android');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // Auto-detect Apple iOS/iPadOS devices
    const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isApple) {
      setPlatform('apple');
    } else {
      setPlatform('android');
    }
  }, []);

  const handleCopyLink = () => {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }).catch(() => {});
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0d14',
        color: '#f8fafc',
        padding: '24px 16px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', paddingTop: '12px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1e293b 0%, #0c1017 100%)',
              border: '2px solid #4EB1CB',
              boxShadow: '0 8px 24px rgba(78, 177, 203, 0.25)',
              fontSize: '32px',
              marginBottom: '14px',
            }}
          >
            🎼
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 900,
              letterSpacing: '0.5px',
              color: '#fff',
              margin: '0 0 6px',
            }}
          >
            HGF Band Stage App
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#94a3b8',
              margin: 0,
            }}
          >
            Official Stage Tool for House of Grace Fellowship Musicians
          </p>
        </div>

        {/* Platform Selector */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#131c2e',
            borderRadius: '12px',
            padding: '4px',
            gap: '4px',
            border: '1px solid #1e293b',
          }}
        >
          <button
            onClick={() => setPlatform('android')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: platform === 'android' ? '#4EB1CB' : 'transparent',
              color: platform === 'android' ? '#070a0f' : '#94a3b8',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🤖</span>
            <span>Android (APK)</span>
          </button>
          <button
            onClick={() => setPlatform('apple')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: platform === 'apple' ? '#4EB1CB' : 'transparent',
              color: platform === 'apple' ? '#070a0f' : '#94a3b8',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🍎</span>
            <span>iPad / iPhone</span>
          </button>
        </div>

        {/* Platform Content */}
        {platform === 'android' ? (
          <div
            style={{
              background: '#0c1017',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#4EB1CB', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Sunday Stage Edition
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                HGF Band Native App (v1.0)
              </h2>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                Direct APK download • Ready for music stands
              </div>
            </div>

            <a
              href="/downloads/hgf-band.apk"
              download="hgf-band.apk"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                height: '52px',
                borderRadius: '12px',
                background: '#4EB1CB',
                color: '#070a0f',
                fontWeight: 800,
                fontSize: '16px',
                textDecoration: 'none',
                boxShadow: '0 4px 18px rgba(78, 177, 203, 0.4)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '20px' }}>⬇️</span>
              <span>Download HGF Band APK</span>
            </a>

            {/* Stage Feature Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                paddingTop: '6px',
              }}
            >
              <div style={{ padding: '12px', borderRadius: '10px', background: '#131c2e', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#facc15', marginBottom: '4px' }}>
                  ⚡ Screen Always-On
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Keeps the display awake continuously during songs and prayers.
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '10px', background: '#131c2e', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', marginBottom: '4px' }}>
                  🦶 Foot Pedal Ready
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Hands-free scrolling and song switching with Bluetooth pedals.
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '10px', background: '#131c2e', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#4ade80', marginBottom: '4px' }}>
                  🎹 Seamless Audio
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Continuous background pads and multitrack backtracks.
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '10px', background: '#131c2e', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#ec4899', marginBottom: '4px' }}>
                  🔒 Permanent Login
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Never gets logged out on your tablet or smartphone.
                </div>
              </div>
            </div>

            {/* Step-by-step installation instructions */}
            <div
              style={{
                background: '#070a0f',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid #1e293b',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                📋 Sideloading Instructions:
              </div>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  fontSize: '13px',
                  color: '#94a3b8',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  lineHeight: '1.4',
                }}
              >
                <li>Tap <strong>Download HGF Band APK</strong> button above.</li>
                <li>If prompted with <em>"File might be harmful"</em>, tap <strong>Download anyway</strong>.</li>
                <li>Open the file from your notifications or Downloads folder, then tap <strong>Install</strong>.</li>
                <li>If prompted, toggle on <em>"Allow from this source"</em> (Install unknown apps).</li>
                <li>Launch <strong>HGF Band</strong> from your home screen!</li>
              </ol>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#0c1017',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                iPad & iPhone Setup
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Stage Home Screen App
              </h2>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                Instant native fullscreen stage experience without App Store delays
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', borderRadius: '12px', background: '#131c2e', border: '1px solid #1e293b' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '999px', background: '#4EB1CB', color: '#070a0f', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  1
                </div>
                <div style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: '1.4' }}>
                  Open <strong style={{ color: '#4EB1CB' }}>connect.houseofgrace.ph/band</strong> in <strong style={{ color: '#fff' }}>Safari</strong>.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', borderRadius: '12px', background: '#131c2e', border: '1px solid #1e293b' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '999px', background: '#4EB1CB', color: '#070a0f', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  2
                </div>
                <div style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: '1.4' }}>
                  Tap the <strong>Share</strong> button (the square with the arrow pointing up <span style={{ fontSize: '16px' }}>⎋</span>) in Safari's top bar or bottom navigation.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', borderRadius: '12px', background: '#131c2e', border: '1px solid #1e293b' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '999px', background: '#4EB1CB', color: '#070a0f', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  3
                </div>
                <div style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: '1.4' }}>
                  Scroll down the share sheet and tap <strong style={{ color: '#38bdf8' }}>"Add to Home Screen"</strong> (➕).
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', borderRadius: '12px', background: '#131c2e', border: '1px solid #1e293b' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '999px', background: '#4EB1CB', color: '#070a0f', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  4
                </div>
                <div style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: '1.4' }}>
                  Tap <strong>Add</strong> at top right. The <strong>HGF Band</strong> app icon is now on your iPad! When launched, it opens directly into fullscreen stage view without any Safari address bar.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons: Launch Web App & Share */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link
            href="/band"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '48px',
              borderRadius: '12px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <span>🎼</span>
            <span>Open The Band Tool in Browser</span>
          </Link>

          <button
            onClick={handleCopyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '44px',
              borderRadius: '12px',
              background: copiedLink ? '#059669' : '#131c2e',
              border: `1px solid ${copiedLink ? '#10b981' : '#2d3f5e'}`,
              color: copiedLink ? '#fff' : '#4EB1CB',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{copiedLink ? '✓ Copied Link' : '🔗 Copy Shareable Link for Musicians'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
