"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

export default function PWAInstallModal({ onClose }: { onClose: () => void }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) { onClose(); return; }
    if (localStorage.getItem("pwa-installed") === "true") { onClose(); return; }
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) { onClose(); return; }

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    if (isIOS) setPlatform("ios");
    else if (isAndroid) setPlatform("android");
    else setPlatform("desktop");

    if ((window as any).__pwaInstallPrompt) {
      setDeferredPrompt((window as any).__pwaInstallPrompt);
      setShowModal(true);
      return;
    }
    if (isIOS) { setShowModal(true); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).__pwaInstallPrompt = e;
      setShowModal(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const fallback = setTimeout(() => { if (!(window as any).__pwaInstallPrompt) setShowModal(true); }, 3000);
    const installHandler = () => { setShowModal(false); localStorage.setItem("pwa-installed", "true"); onClose(); };
    window.addEventListener("appinstalled", installHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installHandler);
      clearTimeout(fallback);
    };
  }, [onClose]);

  const handleInstall = useCallback(async () => {
    const prompt = deferredPrompt || (window as any).__pwaInstallPrompt;
    if (!prompt) return;
    try {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") { localStorage.setItem("pwa-installed", "true"); setShowModal(false); onClose(); }
    } catch (err) { console.error("[PWA] Install error:", err); }
    setDeferredPrompt(null);
    (window as any).__pwaInstallPrompt = null;
  }, [deferredPrompt, onClose]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    setShowModal(false);
    onClose();
  }, [onClose]);

  const handleAlreadyInstalled = useCallback(() => {
    localStorage.setItem("pwa-installed", "true");
    setShowModal(false);
    onClose();
  }, [onClose]);

  if (!showModal) return null;

  const hasInstallPrompt = !!(deferredPrompt || (window as any).__pwaInstallPrompt);
  const isIOSChrome = /CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10001,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.25rem",
      background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
    }}>
      <div style={{
        background: "white", borderRadius: "22px", maxWidth: "360px",
        width: "100%", overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
      }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #0f2d3d 0%, #1f6477 100%)",
          padding: "1.5rem 1.5rem 1.25rem", textAlign: "center",
        }}>
          {/* Real HGF logo in white rounded box */}
          <div style={{
            width: 64, height: 64, borderRadius: "16px",
            background: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 0.75rem",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            overflow: "hidden",
          }}>
            <Image
              src="/HGF-icon-v1.0.png"
              alt="HGF Connect"
              width={56}
              height={56}
              style={{ objectFit: "contain" }}
            />
          </div>
          <h2 style={{ color: "white", fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.2rem" }}>
            Install HGF Connect
          </h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem", margin: 0 }}>
            Get the full app experience
          </p>
        </div>

        {/* ── Condensed Benefits (2 rows instead of 4) ────────────────────── */}
        <div style={{ padding: "1rem 1.25rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[
            ["🔓⚡", "Sign in with Face ID · Fast loading · Works offline"],
            ["🚀🔔", "Quick home screen access · Push notifications"],
          ].map(([icons, text]) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <span style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "#f0f9ff", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "0.85rem", flexShrink: 0,
              }}>
                {icons}
              </span>
              <span style={{ fontSize: "0.8125rem", color: "#374151", lineHeight: 1.35 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* ── Platform-specific instructions ──────────────────────────────── */}
        <div style={{ padding: "0 1.25rem 0.75rem" }}>

          {platform === "ios" ? (
            <div>
              <div style={{
                background: "#fff7ed", border: "1px solid #fed7aa",
                borderRadius: "12px", padding: "0.75rem 0.875rem", marginBottom: "0.625rem",
              }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#9a3412", margin: "0 0 0.4rem" }}>
                  📱 How to install on iPhone:
                </p>
                {isIOSChrome ? (
                  <>
                    <p style={{ fontSize: "0.78rem", color: "#c2410c", margin: "0 0 0.375rem" }}>
                      You&apos;re using <strong>Chrome</strong>. iPhone apps must be installed from <strong>Safari</strong>.
                    </p>
                    <ol style={{ fontSize: "0.78rem", color: "#c2410c", paddingLeft: "1.125rem", margin: 0, lineHeight: 1.65 }}>
                      <li>Copy the link below</li>
                      <li>Open <strong>Safari</strong> and paste it</li>
                      <li>Tap <strong>Share ⎙</strong> → <strong>"Add to Home Screen"</strong></li>
                    </ol>
                  </>
                ) : (
                  <ol style={{ fontSize: "0.78rem", color: "#c2410c", paddingLeft: "1.125rem", margin: 0, lineHeight: 1.65 }}>
                    <li>Tap the <strong>Share ⎙</strong> button at the bottom</li>
                    <li>Tap <strong>"Add to Home Screen"</strong></li>
                    <li>Tap <strong>"Add"</strong> in the top right</li>
                  </ol>
                )}
              </div>
              {isIOSChrome && (
                <button
                  id="hgf-copy-link-btn"
                  style={{ width: "100%", padding: "0.8rem", background: "linear-gradient(135deg, #4EB1CB, #3a8fa8)", color: "white", border: "none", borderRadius: "999px", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: "0.5rem" }}
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin);
                    const btn = document.getElementById("hgf-copy-link-btn");
                    if (btn) { btn.textContent = "✅ Link copied! Open Safari & paste"; (btn as HTMLButtonElement).style.background = "#16a34a"; }
                  }}
                >
                  📋 Copy Link for Safari
                </button>
              )}
              <button style={btnGreen} onClick={handleAlreadyInstalled}>✅ I&apos;ve already installed it</button>
              <button style={btnGhost} onClick={handleDismiss}>Remind me later</button>
            </div>

          ) : hasInstallPrompt ? (
            <div>
              <button style={btnPrimary} onClick={handleInstall}>📲 Install App Now</button>
              <button style={btnGreen} onClick={handleAlreadyInstalled}>✅ I&apos;ve already installed it</button>
              <button style={btnGhost} onClick={handleDismiss}>Remind me tomorrow</button>
            </div>

          ) : (
            <div>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "0.75rem 0.875rem", marginBottom: "0.625rem" }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1e40af", margin: "0 0 0.375rem" }}>
                  {platform === "android" ? "📱 How to install:" : "💻 How to install:"}
                </p>
                {platform === "android" ? (
                  <ol style={{ fontSize: "0.78rem", color: "#1d4ed8", paddingLeft: "1.125rem", margin: 0, lineHeight: 1.65 }}>
                    <li>Tap the <strong>⋮ menu</strong> (3 dots) in Chrome</li>
                    <li>Tap <strong>"Add to Home screen"</strong></li>
                    <li>Tap <strong>"Install"</strong></li>
                  </ol>
                ) : (
                  <p style={{ fontSize: "0.78rem", color: "#1d4ed8", margin: 0 }}>
                    Click the install icon <code style={{ background: "#dbeafe", padding: "1px 5px", borderRadius: 4 }}>⊕</code> in your browser&apos;s address bar.
                  </p>
                )}
              </div>
              <button style={btnGreen} onClick={handleAlreadyInstalled}>✅ I&apos;ve already installed it</button>
              <button style={btnGhost} onClick={handleDismiss}>Remind me later</button>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <p style={{ textAlign: "center", fontSize: "0.65rem", color: "#cbd5e1", padding: "0 1.25rem 1rem", margin: 0 }}>
          No app store needed — installs directly from your browser
        </p>
      </div>
    </div>
  );
}

// ── Shared button styles ─────────────────────────────────────────────────────
const btnPrimary: React.CSSProperties = {
  width: "100%", padding: "0.8rem",
  background: "linear-gradient(135deg, #4EB1CB, #3a8fa8)",
  color: "white", border: "none", borderRadius: "999px",
  fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
  fontFamily: "inherit", marginBottom: "0.5rem",
};
const btnGreen: React.CSSProperties = {
  width: "100%", padding: "0.7rem",
  background: "#f0fdf4", border: "1px solid #bbf7d0",
  borderRadius: "999px", color: "#16a34a",
  fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
  fontFamily: "inherit", marginBottom: "0.375rem",
};
const btnGhost: React.CSSProperties = {
  width: "100%", padding: "0.65rem",
  background: "transparent", border: "none",
  borderRadius: "999px", color: "#94a3b8",
  fontSize: "0.8rem", fontWeight: 500,
  cursor: "pointer", fontFamily: "inherit",
};
