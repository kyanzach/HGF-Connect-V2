"use client";

import { useEffect, useState } from "react";

const PRIMARY = "#4EB1CB";

export default function LogoutOverlay() {
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const handleLogoutStart = () => {
      setLoggingOut(true);
      // Lock scrolling during logout
      document.body.classList.add("hgf-modal-open");
    };

    window.addEventListener("hgf-logout-start", handleLogoutStart);
    return () => {
      window.removeEventListener("hgf-logout-start", handleLogoutStart);
    };
  }, []);

  if (!loggingOut) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.82)", // Sleek dark tail backdrop
        backdropFilter: "blur(12px)", // Premium glassmorphism
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 9999999, // Ensure it's above everything (headers, modals)
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontFamily: "var(--font-inter), -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          animation: "hgf-fade-in-up 0.3s ease-out forwards",
        }}
      >
        {/* Animated Custom Spinner */}
        <div
          style={{
            position: "relative",
            width: "60px",
            height: "60px",
          }}
        >
          {/* Inner ring */}
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              border: "4px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "50%",
            }}
          />
          {/* Rotating gradient track */}
          <div
            className="hgf-logout-spinner"
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              border: "4px solid transparent",
              borderTopColor: PRIMARY,
              borderRadius: "50%",
            }}
          />
        </div>

        {/* Text indicators */}
        <div style={{ textAlign: "center" }}>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              margin: "0 0 0.25rem",
              letterSpacing: "-0.01em",
            }}
          >
            Signing out...
          </h3>
          <p
            style={{
              fontSize: "0.85rem",
              color: "rgba(255, 255, 255, 0.6)",
              margin: 0,
            }}
          >
            Securing your connection
          </p>
        </div>
      </div>

      <style>{`
        .hgf-logout-spinner {
          animation: hgf-rotate 0.8s linear infinite;
        }
        @keyframes hgf-rotate {
          100% { transform: rotate(360deg); }
        }
        @keyframes hgf-fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
