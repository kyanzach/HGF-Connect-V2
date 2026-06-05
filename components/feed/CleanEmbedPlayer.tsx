"use client";

import { useState, useRef } from "react";

interface CleanEmbedPlayerProps {
  url: string;
  type: "facebook" | "instagram";
}

export default function CleanEmbedPlayer({ url, type }: CleanEmbedPlayerProps) {
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    setIsPseudoFullscreen(!isPseudoFullscreen);
  };

  let embedUrl = "";
  if (type === "facebook") {
    embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
  } else if (type === "instagram") {
    const cleanUrl = url.split("?")[0].replace(/\/$/, "");
    embedUrl = `${cleanUrl}/embed/`;
  }

  if (!embedUrl) return null;

  return (
    <div
      ref={wrapperRef}
      className={isPseudoFullscreen ? "pseudo-fullscreen-active" : ""}
      style={{
        position: isPseudoFullscreen ? "fixed" : "relative",
        top: isPseudoFullscreen ? 0 : undefined,
        left: isPseudoFullscreen ? 0 : undefined,
        width: "100%",
        height: isPseudoFullscreen ? "100%" : undefined,
        paddingBottom: isPseudoFullscreen ? "0" : type === "facebook" ? "56.25%" : "125%", // 16:9 for FB, taller for Instagram
        background: "#000",
        borderRadius: isPseudoFullscreen ? "0" : "14px",
        overflow: "hidden",
        boxShadow: isPseudoFullscreen ? "none" : "0 10px 30px rgba(0, 0, 0, 0.25)",
        zIndex: isPseudoFullscreen ? 99999 : undefined,
      }}
    >
      <iframe
        src={embedUrl}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          border: "none",
        }}
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        scrolling="no"
      />

      {/* Fullscreen Overlay Button */}
      <button
        type="button"
        onClick={toggleFullscreen}
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          background: "rgba(0, 0, 0, 0.6)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "6px 10px",
          fontSize: "0.8rem",
          fontWeight: 700,
          cursor: "pointer",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: "4px",
          backdropFilter: "blur(4px)",
        }}
      >
        {isPseudoFullscreen ? "🗗 Minimize" : "⛶ Maximize"}
      </button>

      <style>{`
        .pseudo-fullscreen-active {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 99999 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        @media (max-width: 767px) and (orientation: portrait) {
          .pseudo-fullscreen-active {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100dvh !important;
            height: 100dvw !important;
            transform: rotate(90deg) translateY(-100dvw) !important;
            transform-origin: top left !important;
            z-index: 99999 !important;
          }
        }
      `}</style>
    </div>
  );
}
