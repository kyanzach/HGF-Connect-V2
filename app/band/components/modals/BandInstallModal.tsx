// app/band/components/modals/BandInstallModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '@/lib/version';

interface BandInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BandInstallModal: React.FC<BandInstallModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'android' | 'apple'>('android');
  const [copiedLink, setCopiedLink] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{
    isNative: boolean;
    nativeVersion: string | null;
    isOutdated: boolean;
  }>({
    isNative: false,
    nativeVersion: null,
    isOutdated: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const match = ua.match(/HGFBandApp\/([\d.]+)/);
    let ver = match && match[1] ? match[1] : null;

    if (!ver && (window as any).AndroidBand?.getAppVersion) {
      try {
        ver = (window as any).AndroidBand.getAppVersion();
      } catch (_) {}
    }

    if (ver) {
      // Current release APK is v1.1.0
      const isOutdated = ver === '1.0' || ver === '1.0.0';
      setDeviceInfo({
        isNative: true,
        nativeVersion: ver,
        isOutdated,
      });
    } else {
      setDeviceInfo({
        isNative: false,
        nativeVersion: null,
        isOutdated: false,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const url = 'https://connect.houseofgrace.ph/band/install';
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
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          backgroundColor: '#0c1017',
          border: '1px solid #1e293b',
          borderRadius: '18px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#070a0f',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>📲</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: '16px', color: '#fff' }}>
                  HGF Worship Team Setlist &amp; Chords
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: deviceInfo.isNative
                      ? deviceInfo.isOutdated
                        ? 'rgba(234, 179, 8, 0.2)'
                        : 'rgba(34, 197, 94, 0.2)'
                      : 'rgba(78, 177, 203, 0.2)',
                    color: deviceInfo.isNative
                      ? deviceInfo.isOutdated
                        ? '#facc15'
                        : '#4ade80'
                      : '#4EB1CB',
                    border: `1px solid ${
                      deviceInfo.isNative
                        ? deviceInfo.isOutdated
                          ? 'rgba(234, 179, 8, 0.4)'
                          : 'rgba(34, 197, 94, 0.4)'
                        : 'rgba(78, 177, 203, 0.4)'
                    }`,
                  }}
                >
                  You&apos;re on: {deviceInfo.isNative ? `APK v${deviceInfo.nativeVersion}` : `Web v${APP_VERSION}`}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>
                {deviceInfo.isNative ? (
                  deviceInfo.isOutdated ? (
                    <span style={{ color: '#facc15' }}>⚠️ Update available (v1.1.0) • Fixes pull-to-refresh &amp; verse scrolling</span>
                  ) : (
                    <span style={{ color: '#4ade80' }}>✅ Up-to-date with latest APK build (v{deviceInfo.nativeVersion})</span>
                  )
                ) : (
                  <span>Musician Stage Setup for Sunday • Web v{APP_VERSION}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: '#1e293b',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Platform Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#131c2e',
            borderBottom: '1px solid #1e293b',
            padding: '4px',
            gap: '4px',
          }}
        >
          <button
            onClick={() => setActiveTab('android')}
            style={{
              padding: '10px 12px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'android' ? '#4EB1CB' : 'transparent',
              color: activeTab === 'android' ? '#070a0f' : '#94a3b8',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🤖</span>
            <span>Android (APK)</span>
          </button>
          <button
            onClick={() => setActiveTab('apple')}
            style={{
              padding: '10px 12px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'apple' ? '#4EB1CB' : 'transparent',
              color: activeTab === 'apple' ? '#070a0f' : '#94a3b8',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🍎</span>
            <span>iPad / iPhone</span>
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'android' ? (
            <>
              {/* Outdated APK Warning Banner */}
              {deviceInfo.isNative && deviceInfo.isOutdated && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(234, 179, 8, 0.15)',
                    border: '1px solid rgba(234, 179, 8, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>⚠️</span>
                  <div style={{ fontSize: '12px', color: '#fef08a', lineHeight: '1.4' }}>
                    <strong>Update Required on this Device:</strong> You are currently running <strong>APK v{deviceInfo.nativeVersion}</strong>. Tap below to download and install <strong>v1.1.0</strong> to remove the native pull-to-refresh and enable smooth scrolling to Verse 1.
                  </div>
                </div>
              )}

              {/* Up-to-date APK Confirmation */}
              {deviceInfo.isNative && !deviceInfo.isOutdated && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>✅</span>
                  <div style={{ fontSize: '12px', color: '#86efac', lineHeight: '1.4' }}>
                    <strong>Up to Date:</strong> This device is running <strong>APK v{deviceInfo.nativeVersion}</strong> with smooth verse scrolling and screen stay-awake active.
                  </div>
                </div>
              )}

              {/* Android Download Banner */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(78,177,203,0.15) 0%, rgba(30,41,59,0.5) 100%)',
                  border: '1px solid rgba(78, 177, 203, 0.4)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Dedicated Stage APK</span>
                    <span style={{ fontSize: '11px', background: '#4EB1CB', color: '#070a0f', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                      v1.1.0
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                    Package: <code style={{ color: '#4EB1CB' }}>ph.houseofgrace.band</code> • Build: <strong style={{ color: '#fff' }}>v1.1.0</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    ✨ Clean build • Pull-to-refresh removed • Smooth verse 1 scrolling
                  </div>
                </div>

                <a
                  href="/downloads/hgf-band.apk"
                  download="hgf-band.apk"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    height: '46px',
                    borderRadius: '10px',
                    background: '#4EB1CB',
                    color: '#070a0f',
                    fontWeight: 800,
                    fontSize: '15px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(78, 177, 203, 0.4)',
                  }}
                >
                  <span>⬇️</span>
                  <span>Download HGF Worship APK (v1.1.0)</span>
                </a>
              </div>

              {/* Stage Optimizations Highlights */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                }}
              >
                <div style={{ padding: '10px', borderRadius: '8px', background: '#131c2e', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#facc15' }}>⚡ Screen Always-On</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Never sleeps or dims on your music stand.</div>
                </div>
                <div style={{ padding: '10px', borderRadius: '8px', background: '#131c2e', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8' }}>🦶 Foot Pedal Ready</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Bluetooth / USB pedal scroll (PageDown/Up).</div>
                </div>
                <div style={{ padding: '10px', borderRadius: '8px', background: '#131c2e', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#4ade80' }}>🎹 Audio Continuity</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Continuous pads & backtracks playback.</div>
                </div>
                <div style={{ padding: '10px', borderRadius: '8px', background: '#131c2e', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#ec4899' }}>🔒 Permanent Login</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>No session logouts on stage devices.</div>
                </div>
              </div>

              {/* How to install */}
              <div style={{ background: '#0a0d14', padding: '12px 14px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  📋 Quick Install Steps:
                </div>
                <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Tap <strong>Download HGF Worship APK</strong> above.</li>
                  <li>When browser warns <em>"File might be harmful"</em>, tap <strong>Download anyway</strong>.</li>
                  <li>Tap the downloaded file and choose <strong>Install</strong> (Allow <em>"Install unknown apps"</em> if asked).</li>
                  <li>Open <strong>HGF Worship</strong> directly from your app drawer!</li>
                </ol>
              </div>
            </>
          ) : (
            <>
              {/* Apple (iPad / iPhone) Walkthrough */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(30,41,59,0.5) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#fff' }}>
                  Standalone Stage App for iPad & iPhone
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                  Zero App Store wait — launches directly into fullscreen stage chords mode.
                </div>
              </div>

              {/* Step Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '10px', background: '#131c2e', border: '1px solid #1e293b' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '999px', background: '#4EB1CB', color: '#070a0f', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0' }}>
                    Open <strong style={{ color: '#4EB1CB' }}>connect.houseofgrace.ph/band</strong> in <strong style={{ color: '#fff' }}>Safari</strong> on your iPad or iPhone.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '10px', background: '#131c2e', border: '1px solid #1e293b' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '999px', background: '#4EB1CB', color: '#070a0f', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0' }}>
                    Tap the <strong>Share</strong> button (the square with the arrow pointing up <span style={{ fontSize: '16px' }}>⎋</span>) in Safari.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '10px', background: '#131c2e', border: '1px solid #1e293b' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '999px', background: '#4EB1CB', color: '#070a0f', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    3
                  </div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0' }}>
                    Scroll down and tap <strong style={{ color: '#38bdf8' }}>"Add to Home Screen"</strong> (➕).
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '10px', background: '#131c2e', border: '1px solid #1e293b' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '999px', background: '#4EB1CB', color: '#070a0f', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    4
                  </div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0' }}>
                    Tap <strong>Add</strong> at top right. The <strong>HGF Worship</strong> icon will now appear on your home screen and open in full native standalone mode!
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Share with Band Section */}
          <div
            style={{
              paddingTop: '10px',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Share link with musicians:
            </div>
            <button
              onClick={handleCopyLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: copiedLink ? '#059669' : '#1e293b',
                border: `1px solid ${copiedLink ? '#10b981' : '#334155'}`,
                color: copiedLink ? '#fff' : '#4EB1CB',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span>{copiedLink ? '✓ Copied' : '🔗 Copy Share Link'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
