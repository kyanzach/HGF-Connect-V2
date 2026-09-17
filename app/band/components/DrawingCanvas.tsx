// app/band/components/DrawingCanvas.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  const isDrawing = useRef<boolean>(false);
  const currentPoints = useRef<DrawingPoint[]>([]);

  const isMdOrAdmin = currentUser?.role === 'MD' || currentUser?.role === 'admin';

  useEffect(() => {
    setStrokes(savedStrokes || []);
  }, [savedStrokes]);

  // Determine which strokes are visible based on user role and showAllMembers toggle
  const getVisibleStrokes = useCallback(() => {
    if (isMdOrAdmin) {
      if (showAllMembers) {
        return strokes;
      }
      // Show only global strokes and MD's own strokes
      return strokes.filter(
        (s) => s.scope === 'global' || !s.scope || s.userId === currentUser?.id
      );
    }

    // Regular member / guest view:
    // 1. All global strokes (from MD and Admin)
    // 2. Plus this user's personal strokes
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
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = (stroke.width || 4) * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const p0 = stroke.points[0];
      const p0nx = (p0 as any).nx !== undefined
        ? (p0 as any).nx
        : Array.isArray(p0)
        ? (p0 as any)[0]
        : (p0 as any).x / Math.max(canvas.width, 1);
      const p0ny = (p0 as any).ny !== undefined
        ? (p0 as any).ny
        : Array.isArray(p0)
        ? (p0 as any)[1]
        : (p0 as any).y / Math.max(canvas.height, 1);

      ctx.moveTo(p0nx * canvas.width, p0ny * canvas.height);

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        const nx = (pt as any).nx !== undefined
          ? (pt as any).nx
          : Array.isArray(pt)
          ? (pt as any)[0]
          : (pt as any).x / Math.max(canvas.width, 1);
        const ny = (pt as any).ny !== undefined
          ? (pt as any).ny
          : Array.isArray(pt)
          ? (pt as any)[1]
          : (pt as any).y / Math.max(canvas.height, 1);

        ctx.lineTo(nx * canvas.width, ny * canvas.height);
      }
      ctx.stroke();
    });
  }, [getVisibleStrokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Sync canvas size with parent scrollable container (#sheetWrapper)
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wrapper = containerRef?.current || document.getElementById('sheetWrapper');
    if (!wrapper) return;

    // Temporarily reset inline dimensions so canvas doesn't artificially inflate wrapper scroll dimensions
    canvas.style.width = '0px';
    canvas.style.height = '0px';

    const contentW = Math.max(wrapper.scrollWidth, wrapper.clientWidth);
    const contentH = Math.max(wrapper.scrollHeight, wrapper.clientHeight);

    // Apply explicit CSS dimensions matching actual scrollable content
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
    const handleResize = () => {
      updateCanvasSize();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    const interval = setInterval(updateCanvasSize, 1200);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearInterval(interval);
    };
  }, [updateCanvasSize]);

  // Whenever isActive changes to true, force a resize & redraw so coordinates match perfectly
  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        updateCanvasSize();
        redraw();
      }, 50);
    }
  }, [isActive, updateCanvasSize, redraw]);

  // Precise coordinate mapping: maps clientX/clientY relative to rendered bounding rect into normalized 0..1 and canvas bitmap pixels
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

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    isDrawing.current = true;
    const pos = getCanvasCoords(e);
    currentPoints.current = [pos];

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / Math.max(rect.width, 1);

      ctx.beginPath();
      ctx.strokeStyle = isEraser ? '#0a0d14' : color;
      ctx.lineWidth = (isEraser ? 24 : lineWidth) * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasCoords(e);
    const prev = currentPoints.current[currentPoints.current.length - 1];
    currentPoints.current.push(pos);

    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(rect.width, 1);

    ctx.beginPath();
    ctx.strokeStyle = isEraser ? '#0a0d14' : color;
    ctx.lineWidth = (isEraser ? 24 : lineWidth) * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (prev) {
      ctx.moveTo(prev.x, prev.y);
    } else {
      ctx.moveTo(pos.x, pos.y);
    }
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
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

    if (currentPoints.current.length > 0) {
      const newStroke: DrawingStroke = {
        color: isEraser ? '#0a0d14' : color,
        width: isEraser ? 24 : lineWidth,
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
    // If MD/Admin, clear everything. If personal/guest/member, clear all non-global strokes
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

  return (
    <>
      {/* 
        CANVAS ALWAYS REMAINS MOUNTED DIRECTLY OVER THE FULL SCROLLABLE SHEET.
        When isActive is false: pointerEvents: none allows normal scrolling and tapping.
        When isActive is true: pointerEvents: auto captures pen/finger/mouse drawing with touch-action: none.
      */}
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

      {/* DRAWING FLOATING TOOLBAR */}
      {isActive && (
        <div
          style={{
            position: 'fixed',
            top: 'max(60px, calc(env(safe-area-inset-top) + 50px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99,
            backgroundColor: 'rgba(15, 20, 32, 0.94)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #2d3f5e',
            borderRadius: '40px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.85)',
            userSelect: 'none',
            maxWidth: '96vw',
            overflowX: 'auto',
          }}
        >
          {/* Scope Indicator Badge */}
          <div
            style={{
              padding: '3px 8px',
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
            title="Eraser"
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              background: isEraser ? '#4EB1CB' : '#1e293b',
              color: isEraser ? '#000' : '#fff',
              border: 'none',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🧹 Eraser
          </button>

          {/* Undo */}
          <button
            onClick={undo}
            title="Undo last stroke"
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
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
              padding: '4px 8px',
              borderRadius: '6px',
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
                padding: '4px 8px',
                borderRadius: '6px',
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
              padding: '4px 12px',
              borderRadius: '20px',
              background: '#4EB1CB',
              color: '#000',
              border: 'none',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Done
          </button>
        </div>
      )}
    </>
  );
};
