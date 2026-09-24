// app/band/components/DrawingCanvas.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DrawingStroke, DrawingPoint, BandUser } from '../types/band';

interface DrawingCanvasProps {
  isActive: boolean;
  onClose: () => void;
  currentUser: BandUser | null;
  savedStrokes?: DrawingStroke[];
  onSaveStrokes?: (strokes: DrawingStroke[]) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  isActive,
  onClose,
  currentUser,
  savedStrokes = [],
  onSaveStrokes,
  containerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<DrawingStroke[]>(savedStrokes);
  const [color, setColor] = useState<string>('#facc15');
  const [lineWidth, setLineWidth] = useState<number>(4);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [showAllMembers, setShowAllMembers] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  // Gesture state tracking
  const isDrawing = useRef<boolean>(false);
  const isPanning = useRef<boolean>(false);
  const currentPoints = useRef<DrawingPoint[]>([]);

  // Two-finger panning state
  const panStartYRef = useRef<number>(0);
  const panStartXRef = useRef<number>(0);
  const lastMidYRef = useRef<number>(0);
  const lastMidXRef = useRef<number>(0);

  const isMdOrAdmin = currentUser?.role === 'MD' || currentUser?.role === 'admin';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync strokes from props, but NEVER wipe non-empty local strokes with an empty array!
  useEffect(() => {
    if (Array.isArray(savedStrokes) && savedStrokes.length > 0) {
      setStrokes(savedStrokes);
    }
  }, [savedStrokes]);

  // Determine which strokes are visible based on user role and showAllMembers toggle
  const getVisibleStrokes = useCallback(() => {
    if (showAllMembers || isMdOrAdmin) {
      return strokes;
    }

    return strokes.filter((s) => {
      if (s.scope === 'global' || !s.scope) return true;
      if (currentUser && s.userId === currentUser.id) return true;
      if (!currentUser && (s.userId === 'guest' || s.scope === 'user')) return true;
      return false;
    });
  }, [strokes, isMdOrAdmin, showAllMembers, currentUser]);

  // High-fidelity rendering with CSS-pixel coordinates & DPR scaling
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(rect.width, 1);
    const cssH = Math.max(rect.height, 1);
    const dpr = canvas.width / cssW;

    ctx.save();
    ctx.scale(dpr, dpr);

    const visibleList = getVisibleStrokes();

    visibleList.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;

      const p0 = stroke.points[0];
      const p0x = p0.x !== undefined ? p0.x : (p0.nx !== undefined ? p0.nx * cssW : 0);
      const p0y = p0.y !== undefined ? p0.y : (p0.ny !== undefined ? p0.ny * cssH : 0);

      // Handle single-point marks (dots, taps)
      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.fillStyle = stroke.color;
        const radius = Math.max(2, (stroke.width || 4) / 2);
        ctx.arc(p0x, p0y, radius, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width || 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(p0x, p0y);

      if (stroke.points.length === 2) {
        const p1 = stroke.points[1];
        const p1x = p1.x !== undefined ? p1.x : (p1.nx !== undefined ? p1.nx * cssW : 0);
        const p1y = p1.y !== undefined ? p1.y : (p1.ny !== undefined ? p1.ny * cssH : 0);
        ctx.lineTo(p1x, p1y);
      } else {
        // Smooth quadratic bezier curves for natural fluid strokes
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const pt = stroke.points[i];
          const next = stroke.points[i + 1];

          const ptx = pt.x !== undefined ? pt.x : (pt.nx !== undefined ? pt.nx * cssW : 0);
          const pty = pt.y !== undefined ? pt.y : (pt.ny !== undefined ? pt.ny * cssH : 0);

          const nxtx = next.x !== undefined ? next.x : (next.nx !== undefined ? next.nx * cssW : 0);
          const nxty = next.y !== undefined ? next.y : (next.ny !== undefined ? next.ny * cssH : 0);

          const midX = (ptx + nxtx) / 2;
          const midY = (pty + nxty) / 2;

          ctx.quadraticCurveTo(ptx, pty, midX, midY);
        }
        const last = stroke.points[stroke.points.length - 1];
        const lastX = last.x !== undefined ? last.x : (last.nx !== undefined ? last.nx * cssW : 0);
        const lastY = last.y !== undefined ? last.y : (last.ny !== undefined ? last.ny * cssH : 0);
        ctx.lineTo(lastX, lastY);
      }

      ctx.stroke();
    });

    ctx.restore();
  }, [getVisibleStrokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Sync canvas size with parent scrollable container (#sheetWrapper)
  const updateCanvasSize = useCallback(() => {
    if (isDrawing.current || isPanning.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wrapper = containerRef?.current || document.getElementById('sheetWrapper');
    if (!wrapper) return;

    const contentW = Math.max(wrapper.scrollWidth, wrapper.clientWidth);
    const contentH = Math.max(wrapper.scrollHeight, wrapper.clientHeight);

    if (contentW <= 0 || contentH <= 0) return;

    canvas.style.width = `${contentW}px`;
    canvas.style.height = `${contentH}px`;

    // High-resolution bitmap scaling (crisp rendering on Retina / iPad / mobile)
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    const bitmapW = Math.round(contentW * dpr);
    const bitmapH = Math.round(contentH * dpr);

    if (Math.abs(canvas.width - bitmapW) > 2 || Math.abs(canvas.height - bitmapH) > 2) {
      canvas.width = bitmapW;
      canvas.height = bitmapH;
      redraw();
    }
  }, [containerRef, redraw]);

  useEffect(() => {
    updateCanvasSize();
    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const wrapper = containerRef?.current || document.getElementById('sheetWrapper');
    let ro: ResizeObserver | null = null;
    if (wrapper && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateCanvasSize();
      });
      ro.observe(wrapper);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (ro) ro.disconnect();
    };
  }, [updateCanvasSize, containerRef]);

  // Whenever isActive changes to true, ensure dimensions & redraw
  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        updateCanvasSize();
        redraw();
      }, 50);
    }
  }, [isActive, updateCanvasSize, redraw]);

  // Precise coordinate mapping in CSS pixels
  const getCanvasCoords = (clientX: number, clientY: number): DrawingPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, nx: 0, ny: 0 };

    const rect = canvas.getBoundingClientRect();
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;

    const cssW = Math.max(rect.width, 1);
    const cssH = Math.max(rect.height, 1);

    const clampedNx = Math.max(0, Math.min(1, cssX / cssW));
    const clampedNy = Math.max(0, Math.min(1, cssY / cssH));

    return {
      x: Math.round(cssX),
      y: Math.round(cssY),
      nx: clampedNx,
      ny: clampedNy,
    };
  };

  // Euclidean distance vector stroke eraser in CSS pixels
  const eraseStrokesAt = useCallback(
    (pos: DrawingPoint) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(rect.width, 1);
      const cssH = Math.max(rect.height, 1);
      const thresholdCss = 28; // 28px hit radius

      setStrokes((prevStrokes) => {
        const remaining = prevStrokes.filter((s) => {
          if (!isMdOrAdmin && s.scope === 'global') return true;
          if (!isMdOrAdmin && s.userId !== currentUser?.id && s.userId !== 'guest') return true;

          const hit = s.points.some((p) => {
            const px = p.x !== undefined ? p.x : (p.nx !== undefined ? p.nx * cssW : 0);
            const py = p.y !== undefined ? p.y : (p.ny !== undefined ? p.ny * cssH : 0);
            return Math.hypot(px - pos.x, py - pos.y) < thresholdCss;
          });
          return !hit;
        });

        if (remaining.length !== prevStrokes.length) {
          if (onSaveStrokes) onSaveStrokes(remaining);
          return remaining;
        }
        return prevStrokes;
      });
    },
    [currentUser, isMdOrAdmin, onSaveStrokes]
  );

  // Draw dot directly on canvas
  const drawDotOnCanvas = (pos: DrawingPoint) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(rect.width, 1);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.beginPath();
    ctx.fillStyle = color;
    const radius = Math.max(2, lineWidth / 2);
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Draw segment directly on canvas during stroke
  const drawSegmentOnCanvas = (prev: DrawingPoint | undefined, curr: DrawingPoint) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(rect.width, 1);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (prev) {
      ctx.moveTo(prev.x, prev.y);
    } else {
      ctx.moveTo(curr.x, curr.y);
    }
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
    ctx.restore();
  };

  // Commit current stroke
  const commitCurrentStroke = () => {
    if (currentPoints.current.length === 0) return;

    const newStroke: DrawingStroke = {
      color,
      width: lineWidth,
      points: [...currentPoints.current],
      scope: isMdOrAdmin ? 'global' : 'user',
      userId: currentUser?.id || 'guest',
      authorName: currentUser?.displayName || (currentUser?.role === 'admin' ? 'Admin' : 'Musician'),
      role: currentUser?.role || 'member',
      timestamp: Date.now(),
    };

    setStrokes((prev) => {
      const updated = [...prev, newStroke];
      if (onSaveStrokes) onSaveStrokes(updated);
      return updated;
    });

    currentPoints.current = [];
  };

  // ── Touch Event Handlers (One-Finger Draw, Two-Finger Pan/Scroll) ────────
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const touches = e.touches;

    if (touches.length === 1) {
      // Exactly 1 finger: We are in DRAWING mode, not panning
      isPanning.current = false;
      isDrawing.current = true;
      const pos = getCanvasCoords(touches[0].clientX, touches[0].clientY);

      if (isEraser) {
        eraseStrokesAt(pos);
      } else {
        currentPoints.current = [pos];
        drawDotOnCanvas(pos);
      }
    } else if (touches.length >= 2) {
      // 2 or more fingers: Enter Two-Finger Pan/Scroll Mode
      isPanning.current = true;

      // Immediately abort and discard any single-finger stroke that just started
      if (isDrawing.current) {
        isDrawing.current = false;
        currentPoints.current = [];
        redraw(); // Erase stray start dot/line
      }

      const midY = (touches[0].clientY + touches[1].clientY) / 2;
      const midX = (touches[0].clientX + touches[1].clientX) / 2;
      panStartYRef.current = midY;
      panStartXRef.current = midX;
      lastMidYRef.current = midY;
      lastMidXRef.current = midX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const touches = e.touches;

    // Two-finger Pan / Scroll ONLY when at least 2 touch points exist
    if (touches.length >= 2) {
      e.preventDefault(); // Stop native page bounce/elasticity
      if (!isPanning.current) {
        isPanning.current = true;
        if (isDrawing.current) {
          isDrawing.current = false;
          currentPoints.current = [];
          redraw();
        }
      }

      const midY = (touches[0].clientY + touches[1].clientY) / 2;
      const midX = (touches[0].clientX + touches[1].clientX) / 2;

      // Recover gracefully if previous mid was uninitialized or NaN
      if (!lastMidYRef.current || isNaN(lastMidYRef.current)) {
        lastMidYRef.current = midY;
      }
      if (!lastMidXRef.current || isNaN(lastMidXRef.current)) {
        lastMidXRef.current = midX;
      }

      const deltaY = midY - lastMidYRef.current;
      const deltaX = midX - lastMidXRef.current;

      lastMidYRef.current = midY;
      lastMidXRef.current = midX;

      const wrapper = containerRef?.current || document.getElementById('sheetWrapper');
      if (wrapper && !isNaN(deltaY)) {
        const maxScroll = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);
        // Strictly clamp nextScroll between ceiling (0) and floor (maxScroll)
        const nextScroll = Math.max(0, Math.min(maxScroll, wrapper.scrollTop - deltaY));
        wrapper.scrollTop = nextScroll;

        if (!isNaN(deltaX)) {
          const maxScrollX = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
          wrapper.scrollLeft = Math.max(0, Math.min(maxScrollX, wrapper.scrollLeft - deltaX));
        }
      }
      return;
    }

    // If touches dropped below 2, panning is terminated
    if (isPanning.current) {
      isPanning.current = false;
      lastMidYRef.current = 0;
      lastMidXRef.current = 0;
      return;
    }

    // Single-finger Drawing: ONLY when exactly 1 finger is active and drawing flag is set
    if (isDrawing.current && touches.length === 1) {
      e.preventDefault(); // Prevent page bounce while drawing
      const pos = getCanvasCoords(touches[0].clientX, touches[0].clientY);

      if (isEraser) {
        eraseStrokesAt(pos);
      } else {
        const prev = currentPoints.current[currentPoints.current.length - 1];
        currentPoints.current.push(pos);
        drawSegmentOnCanvas(prev, pos);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const remaining = e.touches.length;

    // If fewer than 2 fingers remain, PANNING MUST STOP
    if (remaining < 2) {
      isPanning.current = false;
      lastMidYRef.current = 0;
      lastMidXRef.current = 0;
    }

    if (remaining === 0) {
      if (isDrawing.current) {
        isDrawing.current = false;
        if (!isEraser && currentPoints.current.length > 0) {
          commitCurrentStroke();
        }
        currentPoints.current = [];
      }
    }
  };

  const handleTouchCancel = () => {
    isDrawing.current = false;
    isPanning.current = false;
    lastMidYRef.current = 0;
    lastMidXRef.current = 0;
    currentPoints.current = [];
    redraw();
  };

  // ── Mouse / Desktop Fallback ─────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isActive || e.button !== 0) return;
    isDrawing.current = true;
    const pos = getCanvasCoords(e.clientX, e.clientY);

    if (isEraser) {
      eraseStrokesAt(pos);
    } else {
      currentPoints.current = [pos];
      drawDotOnCanvas(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isActive || !isDrawing.current) return;
    const pos = getCanvasCoords(e.clientX, e.clientY);

    if (isEraser) {
      eraseStrokesAt(pos);
    } else {
      const prev = currentPoints.current[currentPoints.current.length - 1];
      currentPoints.current.push(pos);
      drawSegmentOnCanvas(prev, pos);
    }
  };

  const handleMouseUp = () => {
    if (!isActive || !isDrawing.current) return;
    isDrawing.current = false;
    if (!isEraser && currentPoints.current.length > 0) {
      commitCurrentStroke();
    }
    currentPoints.current = [];
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const wrapper = containerRef?.current || document.getElementById('sheetWrapper');
    if (wrapper) {
      const maxScroll = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);
      wrapper.scrollTop = Math.max(0, Math.min(maxScroll, wrapper.scrollTop + e.deltaY));
      const maxScrollX = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
      wrapper.scrollLeft = Math.max(0, Math.min(maxScrollX, wrapper.scrollLeft + e.deltaX));
    }
  };

  // ── Quick Scroll Buttons for Floating Toolbar ────────────────────────────
  const scrollSheet = (offset: number) => {
    const wrapper = containerRef?.current || document.getElementById('sheetWrapper');
    if (!wrapper) return;

    // Reset any touch/pan state to ensure gestures aren't locked out
    isPanning.current = false;
    isDrawing.current = false;
    lastMidYRef.current = 0;
    lastMidXRef.current = 0;

    const maxScroll = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);
    // Explicit ceiling at 0, explicit floor at maxScroll
    const currentTop = Math.max(0, Math.min(maxScroll, wrapper.scrollTop));
    const targetTop = Math.max(0, Math.min(maxScroll, currentTop + offset));

    wrapper.scrollTo({
      top: targetTop,
      behavior: 'smooth',
    });
  };

  const undo = () => {
    if (strokes.length === 0) return;
    let targetIndex = -1;
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      if (isMdOrAdmin || s.userId === currentUser?.id || s.userId === 'guest' || s.scope === 'user') {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex !== -1) {
      const updated = strokes.filter((_, idx) => idx !== targetIndex);
      setStrokes(updated);
      if (onSaveStrokes) onSaveStrokes(updated);
      setTimeout(redraw, 10);
    }
  };

  const clearAll = () => {
    const updated = isMdOrAdmin
      ? []
      : strokes.filter((s) => s.scope === 'global');

    setStrokes(updated);
    if (onSaveStrokes) onSaveStrokes(updated);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setTimeout(redraw, 20);
  };

  const toolbarElement = (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1200,
        backgroundColor: 'rgba(15, 20, 32, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid #2d3f5e',
        borderRadius: '40px',
        padding: '7px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9)',
        userSelect: 'none',
        maxWidth: '96vw',
        overflowX: 'auto',
      }}
    >
      {/* Scope / Gesture Badge */}
      <div
        style={{
          padding: '4px 9px',
          borderRadius: '20px',
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          backgroundColor: isMdOrAdmin ? 'rgba(78, 177, 203, 0.2)' : 'rgba(234, 179, 8, 0.15)',
          color: isMdOrAdmin ? '#4EB1CB' : '#facc15',
          border: `1px solid ${isMdOrAdmin ? 'rgba(78, 177, 203, 0.4)' : 'rgba(234, 179, 8, 0.3)'}`,
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <span>{isMdOrAdmin ? '🌐 GLOBAL' : '🔒 PERSONAL'}</span>
        <span style={{ opacity: 0.6, fontSize: '9px' }}>• ✌️ 2-finger scroll</span>
      </div>

      {/* Quick Scroll Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <button
          onClick={() => scrollSheet(-320)}
          title="Scroll Up (or use 2 fingers)"
          style={{
            padding: '5px 8px',
            borderRadius: '8px',
            background: '#1e293b',
            color: '#94a3b8',
            border: '1px solid #334155',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          ▲ Up
        </button>
        <button
          onClick={() => scrollSheet(320)}
          title="Scroll Down to Bridge/Outro (or use 2 fingers)"
          style={{
            padding: '5px 8px',
            borderRadius: '8px',
            background: '#1e293b',
            color: '#94a3b8',
            border: '1px solid #334155',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          ▼ Down
        </button>
      </div>

      <div style={{ width: '1px', height: '18px', backgroundColor: '#334155', margin: '0 2px', flexShrink: 0 }} />

      {/* Color Palette */}
      {[
        { c: '#facc15', label: 'Yellow' },
        { c: '#f87171', label: 'Red' },
        { c: '#4EB1CB', label: 'Cyan' },
        { c: '#10b981', label: 'Green' },
        { c: '#ffffff', label: 'White' },
      ].map((item) => (
        <button
          key={item.c}
          onClick={() => {
            setColor(item.c);
            setIsEraser(false);
          }}
          title={item.label}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: item.c,
            border: color === item.c && !isEraser ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            transform: color === item.c && !isEraser ? 'scale(1.2)' : 'scale(1)',
            transition: 'transform 0.1s ease',
            flexShrink: 0,
          }}
        />
      ))}

      <div style={{ width: '1px', height: '18px', backgroundColor: '#334155', margin: '0 2px', flexShrink: 0 }} />

      {/* Eraser */}
      <button
        onClick={() => setIsEraser(!isEraser)}
        title="Tap or drag over strokes to erase"
        style={{
          padding: '5px 10px',
          borderRadius: '8px',
          background: isEraser ? '#4EB1CB' : '#1e293b',
          color: isEraser ? '#000' : '#fff',
          border: 'none',
          fontSize: '11px',
          fontWeight: 800,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        🧹 Eraser
      </button>

      {/* Undo */}
      <button
        onClick={undo}
        title="Undo last stroke"
        style={{
          padding: '5px 10px',
          borderRadius: '8px',
          background: '#1e293b',
          color: '#fff',
          border: 'none',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        ↶ Undo
      </button>

      {/* Clear */}
      <button
        onClick={clearAll}
        title="Clear annotations"
        style={{
          padding: '5px 10px',
          borderRadius: '8px',
          background: '#ef4444',
          color: '#fff',
          border: 'none',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        🗑️ Clear
      </button>

      {/* Done Button */}
      <button
        onClick={onClose}
        style={{
          padding: '5px 14px',
          borderRadius: '20px',
          background: '#4EB1CB',
          color: '#000',
          border: 'none',
          fontSize: '12px',
          fontWeight: 800,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Done
      </button>
    </div>
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: isActive ? 'auto' : 'none',
          zIndex: 15,
          touchAction: 'none',
          display: 'block',
          cursor: isActive ? (isEraser ? 'cell' : 'crosshair') : 'default',
        }}
      />

      {/* FLOATING TOOLBAR DOCKED TO BODY VIA PORTAL */}
      {isActive && mounted && typeof document !== 'undefined'
        ? createPortal(toolbarElement, document.body)
        : null}
    </>
  );
};
