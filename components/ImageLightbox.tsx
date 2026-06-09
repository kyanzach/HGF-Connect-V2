"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt = "Enlarged view", onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const pinchDist = useRef<number | null>(null);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);

  // Swipe / Drag states
  const isDragging = useRef(false);
  const startDrag = useRef({ x: 0, y: 0 });

  const [mounted, setMounted] = useState(false);

  // Prevent background scrolling while open
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const resetZoom = () => {
    setScale(1);
    setPanX(0);
    setPanY(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch to zoom start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1) {
      // Double tap check
      const now = Date.now();
      if (now - lastTap.current < 300) {
        if (scale > 1) {
          resetZoom();
        } else {
          setScale(2.5);
        }
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;

      // Pan or click start
      panStart.current = { x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      
      const newScale = Math.min(5, Math.max(1, scale * (dist / pinchDist.current)));
      setScale(newScale);
      pinchDist.current = dist;
    } else if (e.touches.length === 1 && scale > 1 && panStart.current) {
      setPanX(e.touches[0].clientX - panStart.current.x);
      setPanY(e.touches[0].clientY - panStart.current.y);
    }
  };

  const handleTouchEnd = () => {
    pinchDist.current = null;
    panStart.current = null;
  };

  // Mouse pan logic for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startDrag.current = { x: e.clientX - panX, y: e.clientY - panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    if (scale > 1) {
      setPanX(e.clientX - startDrag.current.x);
      setPanY(e.clientY - startDrag.current.y);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Zoom control buttons
  const zoomIn = () => setScale((s) => Math.min(5, s + 0.5));
  const zoomOut = () => {
    setScale((s) => {
      const newS = Math.max(1, s - 0.5);
      if (newS === 1) {
        setPanX(0);
        setPanY(0);
      }
      return newS;
    });
  };

  if (!mounted) return null;

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        background: "rgba(0, 0, 0, 0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "opacity 0.2s ease-in-out",
      }}
      onClick={(e) => {
        if (e.target === containerRef.current) onClose();
      }}
    >
      {/* Top Controls */}
      <div
        style={{
          position: "absolute",
          top: "calc(24px + env(safe-area-inset-top, 0px))",
          right: "20px",
          display: "flex",
          gap: "12px",
          zIndex: 20001,
        }}
      >
        {/* Zoom Controls */}
        <button
          onClick={zoomOut}
          disabled={scale === 1}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255, 255, 255, 0.15)",
            color: "white",
            fontSize: "1.2rem",
            cursor: scale === 1 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
            outline: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
          title="Zoom Out"
        >
          ➖
        </button>
        <button
          onClick={zoomIn}
          disabled={scale === 5}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255, 255, 255, 0.15)",
            color: "white",
            fontSize: "1.2rem",
            cursor: scale === 5 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
            outline: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
          title="Zoom In"
        >
          ➕
        </button>
        <button
          onClick={onClose}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255, 255, 255, 0.25)",
            color: "white",
            fontSize: "1.2rem",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
            outline: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Image Area */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          touchAction: "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          style={{
            maxWidth: "96%",
            maxHeight: "86%",
            objectFit: "contain",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: scale > 1 ? "grab" : "zoom-in",
            transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
            transition: pinchDist.current !== null || isDragging.current ? "none" : "transform 0.15s ease-out",
          }}
          onClick={(e) => {
            e.stopPropagation(); // prevent closing when clicking the image
          }}
        />
      </div>

      {/* Bottom Zoom Hint / Reset */}
      {scale > 1 && (
        <button
          onClick={resetZoom}
          style={{
            position: "absolute",
            bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
            padding: "8px 20px",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.15)",
            border: "none",
            color: "white",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.2s",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 20002,
          }}
        >
          Tap to reset zoom
        </button>
      )}
    </div>,
    document.body
  );
}
