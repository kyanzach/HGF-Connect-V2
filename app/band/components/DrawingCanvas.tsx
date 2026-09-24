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
  const isDrawing = useRef<boolean>(false);
  const currentPoints = useRef<DrawingPoint[]>([]);

  const isMdOrAdmin = currentUser?.role === 'MD' || currentUser?.role === 'admin';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setStrokes(savedStrokes || []);
  }, [savedStrokes]);

  // Determine which strokes are visible based on user role and showAllMembers toggle
  const getVisibleStrokes = useCallback(() => {
    if (isMdOrAdmin) {
      if (showAllMembers) {
        return strokes;
      }
      return strokes.filter(
        (s) => s.scope === 'global' || !s.scope || s.userId === currentUser?.id
      );
    }

    return strokes.filter((s) => {
      if (s.scope === 'global' || !s.scope) return true;
      if (currentUser && s.userId === currentUser.id) return true;
      if (!currentUser && (s.userId === 'guest' || s.scope === 'user')) return true;
      return false;
    });
  }, [strokes, isMdOrAdmin, showAllMembers, currentUser]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(rect.width, 1);

    const visibleList = getVisibleStrokes();

    visibleList.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;

      const p0 = stroke.points[0];
      const p0x =
        ((p0 as any).nx !== undefined
          ? (p0 as any).nx
          : (p0 as any).x / Math.max(canvas.width, 1)) * canvas.width;
      const p0y =
        ((p0 as any).ny !== undefined
          ? (p0 as any).ny
          : (p0 as any).y / Math.max(canvas.height, 1)) * canvas.height;

      // Handle single-point marks (dots, taps)
      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.fillStyle = stroke.color;
        const radius = Math.max(2, ((stroke.width || 4) * dpr) / 2);
        ctx.arc(p0x, p0y, radius, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = (stroke.width || 4) * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(p0x, p0y);

      if (stroke.points.length === 2) {
        const p1 = stroke.points[1];
        const p1x =
          ((p1 as any).nx !== undefined
            ? (p1 as any).nx
            : (p1 as any).x / Math.max(canvas.width, 1)) * canvas.width;
        const p1y =
          ((p1 as any).ny !== undefined
            ? (p1 as any).ny
            : (p1 as any).y / Math.max(canvas.height, 1)) * canvas.height;
        ctx.lineTo(p1x, p1y);
      } else {
        // Smooth quadratic bezier curves for natural fluid strokes
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const pt = stroke.points[i];
          const next = stroke.points[i + 1];

          const ptx =
            ((pt as any).nx !== undefined
              ? (pt as any).nx
              : (pt as any).x / Math.max(canvas.width, 1)) * canvas.width;
          const pty =
            ((pt as any).ny !== undefined
              ? (pt as any).ny
              : (pt as any).y / Math.max(canvas.height, 1)) * canvas.height;

          const nxtx =
            ((next as any).nx !== undefined
              ? (next as any).nx
              : (next as any).x / Math.max(canvas.width, 1)) * canvas.width;
          const nxty =
            ((next as any).ny !== undefined
              ? (next as any).ny
              : (next as any).y / Math.max(canvas.height, 1)) * canvas.height;

          const midX = (ptx + nxtx) / 2;
          const midY = (pty + nxty) / 2;

          ctx.quadraticCurveTo(ptx, pty, midX, midY);
        }
        const last = stroke.points[stroke.points.length - 1];
        const lastX =
          ((last as any).nx !== undefined
            ? (last as any).nx
            : (last as any).x / Math.max(canvas.width, 1)) * canvas.width;
        const lastY =
          ((last as any).ny !== undefined
            ? (last as any).ny
            : (last as any).y / Math.max(canvas.height, 1)) * canvas.height;
        ctx.lineTo(lastX, lastY);
      }

      ctx.stroke();
    });
  }, [getVisibleStrokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Sync canvas size non-destructively with parent scrollable container (#sheetWrapper)
  const updateCanvasSize = useCallback(() => {
    if (isDrawing.current) return;
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

    if (canvas.width !== bitmapW || canvas.height !== bitmapH) {
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

  // Precise coordinate mapping: maps clientX/clientY into normalized 0..1 and canvas pixels
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, nx: 0, ny: 0 };

    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    const nx = rect.width > 0 ? cssX / rect.width : 0;
    const ny = rect.height > 0 ? cssY / rect.height : 0;

    const clampedNx = Math.max(0, Math.min(1, nx));
    const clampedNy = Math.max(0, Math.min(1, ny));

    return {
      x: clampedNx * canvas.width,
      y: clampedNy * canvas.height,
      nx: clampedNx,
      ny: clampedNy,
    };
  };

  // Vector stroke eraser: deletes any stroke intersecting eraser radius
  const eraseStrokesAt = useCallback(
    (pos: DrawingPoint) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const thresholdX = 24 / Math.max(rect.width, 1);
      const thresholdY = 24 / Math.max(rect.height, 1);

      setStrokes((prevStrokes) => {
        const remaining = prevStrokes.filter((s) => {
          if (!isMdOrAdmin && s.scope === 'global') return true;
          if (!isMdOrAdmin && s.userId !== currentUser?.id && s.userId !== 'guest') return true;

          const hit = s.points.some((p) => {
            const pnx = p.nx !== undefined ? p.nx : p.x / canvas.width;
            const pny = p.ny !== undefined ? p.ny : p.y / canvas.height;
            return Math.abs(pnx - pos.nx) < thresholdX && Math.abs(pny - pos.ny) < thresholdY;
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

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    isDrawing.current = true;
    const pos = getCanvasCoords(e);

    if (isEraser) {
      eraseStrokesAt(pos);
      return;
    }

    currentPoints.current = [pos];

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / Math.max(rect.width, 1);

      ctx.beginPath();
      ctx.fillStyle = color;
      const radius = Math.max(2, (lineWidth * dpr) / 2);
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = getCanvasCoords(e);

    if (isEraser) {
      eraseStrokesAt(pos);
      return;
    }

    const prev = currentPoints.current[currentPoints.current.length - 1];
    currentPoints.current.push(pos);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / Math.max(rect.width, 1);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (prev) {
        ctx.moveTo(prev.x, prev.y);
      } else {
        ctx.moveTo(pos.x, pos.y);
      }
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    if (!isEraser && currentPoints.current.length > 0) {
      const newStroke: DrawingStroke = {
        color,
        width: lineWidth,
        points: [...currentPoints.current],
        scope: isMdOrAdmin ? 'global' : 'user',
        userId: currentUser?.id || 'guest',
        authorName: currentUser?.displayName || 'Musician',
        role: currentUser?.role || 'member',
        timestamp: Date.now(),
      };
      const updated = [...strokes, newStroke];
      setStrokes(updated);
      if (onSaveStrokes) onSaveStrokes(updated);
    }
    currentPoints.current = [];
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
      {/* Scope Indicator Badge */}
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
        }}
      >
        {isMdOrAdmin ? '🌐 GLOBAL (MD)' : '🔒 PERSONAL'}
      </div>

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

      {/* MD/Admin Show All Toggle */}
      {isMdOrAdmin && (
        <button
          onClick={() => setShowAllMembers(!showAllMembers)}
          title="Toggle view of all members annotations"
          style={{
            padding: '5px 10px',
            borderRadius: '8px',
            background: showAllMembers ? 'rgba(78, 177, 203, 0.2)' : '#1e293b',
            color: showAllMembers ? '#4EB1CB' : '#94a3b8',
            border: `1px solid ${showAllMembers ? '#4EB1CB' : '#334155'}`,
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          👁️ {showAllMembers ? 'Show All' : 'My Only'}
        </button>
      )}

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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
