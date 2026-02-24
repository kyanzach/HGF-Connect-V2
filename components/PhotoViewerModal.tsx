"use client";

/**
 * PhotoViewerModal — Facebook-style full-screen photo history viewer.
 *
 * Props:
 *   photos      – ordered array (newest first) of photo history entries
 *   startIndex  – index to open at
 *   onClose     – close the modal
 *   onRestore   – called with { fileName, thumbUrl } after a successful restore
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export interface HistoryPhoto {
  id: number;
  type: "profile" | "cover";
  fileName: string;
  thumbName: string | null;
  url: string;
  thumbUrl: string | null;
  createdAt: string;
}

interface Props {
  photos: HistoryPhoto[];
  startIndex?: number;
  memberId: number;
  onClose: () => void;
  onRestore?: (photo: HistoryPhoto) => void;
}

const PRIMARY = "#4EB1CB";

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

export default function PhotoViewerModal({ photos, startIndex = 0, memberId, onClose, onRestore }: Props) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(startIndex, photos.length - 1)));
  const [restoring, setRestoring] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const touchX = useRef<number | null>(null);

  const photo = photos[idx];

  // Keyboard navigation
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  setIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx((i) => Math.min(photos.length - 1, i + 1));
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [photos.length, onClose]);

  // Reset img error when photo changes
  useEffect(() => setImgErr(false), [idx]);

  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(photos.length - 1, i + 1));

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const r = await fetch(`/api/members/${memberId}/photo-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId: photo.id }),
      });
      const d = await r.json();
      if (d.ok && onRestore) {
        onRestore({ ...photo, url: d.url, thumbUrl: d.thumbUrl ?? photo.thumbUrl });
        onClose();
      }
    } catch { /* silent */ }
    finally { setRestoring(false); }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}
      // Swipe support
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const delta = touchX.current - e.changedTouches[0].clientX;
        if (delta > 50)  next();
        if (delta < -50) prev();
        touchX.current = null;
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)",
          border: "none", color: "white", borderRadius: "50%", width: 40, height: 40,
          fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 2,
        }}
      >✕</button>

      {/* Counter */}
      <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
        color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", zIndex: 2 }}>
        {idx + 1} / {photos.length}
      </div>

      {/* Left arrow */}
      {idx > 0 && (
        <button onClick={prev} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "50%",
          width: 44, height: 44, fontSize: "1.4rem", cursor: "pointer", zIndex: 2 }}>
          ‹
        </button>
      )}

      {/* Right arrow */}
      {idx < photos.length - 1 && (
        <button onClick={next} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "50%",
          width: 44, height: 44, fontSize: "1.4rem", cursor: "pointer", zIndex: 2 }}>
          ›
        </button>
      )}

      {/* Image */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        width: "100%", padding: "60px 60px 0", boxSizing: "border-box" }}>
        {imgErr ? (
          <div style={{ background: "#374151", borderRadius: 12, width: 220, height: 220,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            color: "#9ca3af", fontSize: "0.85rem", gap: 8 }}>
            <span style={{ fontSize: "2rem" }}>🖼️</span>
            Photo unavailable
          </div>
        ) : (
          <div style={{ position: "relative", maxWidth: "min(400px, 90vw)",
            maxHeight: "calc(100vh - 180px)", width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src={photo.url}
              alt="Photo"
              onError={() => setImgErr(true)}
              style={{ maxWidth: "100%", maxHeight: "calc(100vh - 180px)",
                objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
            />
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ width: "100%", maxWidth: 500, padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>
          {fmt(photo.createdAt)}
        </div>
        <button
          disabled={restoring}
          onClick={handleRestore}
          style={{
            background: restoring ? "#94a3b8" : PRIMARY, border: "none", color: "white",
            borderRadius: 999, padding: "0.5rem 1.25rem", fontSize: "0.85rem",
            fontWeight: 700, cursor: restoring ? "not-allowed" : "pointer", whiteSpace: "nowrap",
          }}
        >
          {restoring ? "Restoring…" : "🔄 Set as Current"}
        </button>
      </div>
    </div>
  );
}
