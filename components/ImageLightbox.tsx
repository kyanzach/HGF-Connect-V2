"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  src: string;
  alt?: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  totalSlides?: number;
}

export default function ImageLightbox({
  src,
  alt = "Enlarged view",
  onClose,
  onPrev,
  onNext,
  currentIndex,
  totalSlides,
}: Props) {
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

  // Touch Swipe navigation
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const [mounted, setMounted] = useState(false);

  // Prevent background scrolling while open
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Keyboard navigation: Escape to close, Arrows to slide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onPrev, onNext]);

  // Reset zoom when image source changes (so the next slide is not zoomed)
  useEffect(() => {
    resetZoom();
  }, [src]);

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

      // Initialize swipe capture if scale is 1
      if (scale === 1) {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      }
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

  const handleTouchEnd = (e: React.TouchEvent) => {
    pinchDist.current = null;
    panStart.current = null;

    // Detect swipe gesture when scale is 1
    if (touchStartX.current !== null && touchStartY.current !== null && scale === 1 && e.changedTouches.length > 0) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      
      // Swipe threshold (horizontal swipe with minimal vertical drift)
      if (Math.abs(dx) > 60 && Math.abs(dy) < 60) {
        if (dx > 0) {
          // Swiped right -> go to previous
          if (onPrev) onPrev();
        } else {
          // Swiped left -> go to next
          if (onNext) onNext();
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
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
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 20000,
        background: "rgba(0, 0, 0, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "opacity 0.2s ease-in-out",
        touchAction: "none",
      }}
      onClick={(e) => {
        if (e.target === containerRef.current) onClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Slide Counter (Top Center) */}
      {typeof currentIndex === "number" && typeof totalSlides === "number" && totalSlides > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(24px + env(safe-area-inset-top, 0px))",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.6)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "0.85rem",
            fontWeight: 700,
            zIndex: 20001,
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            fontFamily: "inherit",
          }}
        >
          {currentIndex + 1} / {totalSlides}
        </div>
      )}

      {/* Top Controls with safe-area notch and battery clearance */}
      <div
        style={{
          position: "absolute",
          top: "max(18px, calc(env(safe-area-inset-top, 0px) + 16px))",
          right: "max(16px, calc(env(safe-area-inset-right, 0px) + 16px))",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 20001,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Zoom Controls */}
        <button
          type="button"
          onClick={zoomOut}
          disabled={scale === 1}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            background: "rgba(15, 23, 42, 0.75)",
            color: "white",
            fontSize: "1.1rem",
            cursor: scale === 1 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s, opacity 0.2s",
            outline: "none",
            opacity: scale === 1 ? 0.4 : 1,
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
          }}
          title="Zoom Out"
        >
          ➖
        </button>
        <button
          type="button"
          onClick={zoomIn}
          disabled={scale === 5}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            background: "rgba(15, 23, 42, 0.75)",
            color: "white",
            fontSize: "1.1rem",
            cursor: scale === 5 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s, opacity 0.2s",
            outline: "none",
            opacity: scale === 5 ? 0.4 : 1,
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
          }}
          title="Zoom In"
        >
          ➕
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Fullscreen View"
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "1.5px solid rgba(255, 255, 255, 0.35)",
            background: "rgba(15, 23, 42, 0.88)",
            color: "white",
            fontSize: "1.25rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            outline: "none",
            boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
          }}
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Left Navigation Control Arrow */}
      {onPrev && totalSlides && totalSlides > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          style={{
            position: "absolute",
            left: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(0, 0, 0, 0.4)",
            color: "white",
            fontSize: "1.2rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s, transform 0.1s",
            outline: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            zIndex: 20002,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0, 0, 0, 0.4)")}
          title="Previous Slide"
        >
          ◀
        </button>
      )}

      {/* Right Navigation Control Arrow */}
      {onNext && totalSlides && totalSlides > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          style={{
            position: "absolute",
            right: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(0, 0, 0, 0.4)",
            color: "white",
            fontSize: "1.2rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s, transform 0.1s",
            outline: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            zIndex: 20002,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0, 0, 0, 0.4)")}
          title="Next Slide"
        >
          ▶
        </button>
      )}

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
          display: "block",
          margin: "0 auto",
        }}
        onClick={(e) => {
          e.stopPropagation(); // prevent closing when clicking the image
        }}
      />

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
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          Tap to reset zoom
        </button>
      )}
    </div>,
    document.body
  );
}
