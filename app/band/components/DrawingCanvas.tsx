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

    // Regular member view:
    // 1. All global strokes (from MD and Admin)
    // 2. Plus this user's personal strokes
    return strokes.filter((s) => {
      if (s.scope === 'global' || !s.scope) return true;
      if (currentUser && s.userId === currentUser.id) return true;
      if (!currentUser && s.userId === 'guest') return true;
      return false;
    });
  }, [strokes, isMdOrAdmin, showAllMembers, currentUser]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const visibleList = getVisibleStrokes();

    visibleList.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Normalized coordinates mapped to current canvas dimensions
      const p0 = stroke.points[0];
      ctx.moveTo(p0.nx * canvas.width, p0.ny * canvas.height);

      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        ctx.lineTo(p.nx * canvas.width, p.ny * canvas.height);
      }
      ctx.stroke();
    });
  }, [getVisibleStrokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Sync canvas size with parent scrollable container
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let targetWidth = window.innerWidth;
    let targetHeight = window.innerHeight;

    if (containerRef?.current) {
      targetWidth = Math.max(containerRef.current.scrollWidth, containerRef.current.clientWidth);
      targetHeight = Math.max(containerRef.current.scrollHeight, containerRef.current.clientHeight);
    }

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      redraw();
    }
  }, [containerRef, redraw]);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    const interval = setInterval(updateCanvasSize, 1000);
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      clearInterval(interval);
    };
  }, [updateCanvasSize]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nx = canvas.width > 0 ? x / canvas.width : 0;
    const ny = canvas.height > 0 ? y / canvas.height : 0;

    currentPoints.current = [{ x, y, nx, ny }];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nx = canvas.width > 0 ? x / canvas.width : 0;
    const ny = canvas.height > 0 ? y / canvas.height : 0;

    const prev = currentPoints.current[currentPoints.current.length - 1];
    currentPoints.current.push({ x, y, nx, ny });

    ctx.beginPath();
    ctx.strokeStyle = isEraser ? '#0a0d14' : color;
    ctx.lineWidth = isEraser ? 24 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (currentPoints.current.length > 1) {
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
    // Allow members to undo their own strokes; MD/Admin can undo any of their strokes
    let targetIndex = -1;
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      if (isMdOrAdmin || s.userId === currentUser?.id || s.userId === 'guest') {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex !== -1) {
      const updated = strokes.filter((_, idx) => idx !== targetIndex);
      setStrokes(updated);
      if (onSaveStrokes) onSaveStrokes(updated);
    }
  };

  const clearAll = () => {
    if (isMdOrAdmin) {
      setStrokes([]);
      if (onSaveStrokes) onSaveStrokes([]);
    } else {
      // Clear only this member's strokes, keeping MD global strokes intact
      const kept = strokes.filter((s) => s.scope === 'global' || s.userId !== currentUser?.id);
      setStrokes(kept);
      if (onSaveStrokes) onSaveStrokes(kept);
    }
  };

  return (
    <>
      {/* 
        CANVAS ALWAYS REMAINS MOUNTED AND VISIBLE.
        When isActive is false: pointer-events is none so scrolling and tapping works uninterrupted.
        When isActive is true: pointer-events is auto so musicians can draw.
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
          width: '100%',
          height: '100%',
          pointerEvents: isActive ? 'auto' : 'none',
          zIndex: 15,
          touchAction: 'none',
          cursor: isActive ? (isEraser ? 'cell' : 'crosshair') : 'default',
        }}
      />

      {/* DRAWING TOOLBAR (Visible only when actively drawing) */}
      {isActive && (
        <div
          style={{
            position: 'fixed',
            top: 'max(90px, calc(env(safe-area-inset-top) + 85px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 80,
            backgroundColor: '#131c2e',
            border: '1px solid #2d3f5e',
            borderRadius: '999px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75)',
            userSelect: 'none',
            maxWidth: '92vw',
            overflowX: 'auto',
          }}
        >
          {/* Scope Indicator Badge */}
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: isMdOrAdmin ? 'rgba(245, 158, 11, 0.2)' : 'rgba(78, 177, 203, 0.2)',
              color: isMdOrAdmin ? '#f59e0b' : '#4EB1CB',
              border: `1px solid ${isMdOrAdmin ? '#f59e0b' : '#4EB1CB'}`,
              whiteSpace: 'nowrap',
            }}
          >
            {isMdOrAdmin ? '👑 MD Global' : '🔒 Personal'}
          </span>

          {/* Color Presets */}
          {[
            { c: '#facc15', label: 'Yellow' },
            { c: '#ef4444', label: 'Red' },
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
                background: showAllMembers ? 'rgba(245, 158, 11, 0.25)' : '#1e293b',
                color: showAllMembers ? '#f59e0b' : '#94a3b8',
                border: `1px solid ${showAllMembers ? '#f59e0b' : '#334155'}`,
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              👁️ {showAllMembers ? 'Showing All' : 'Only MD'}
            </button>
          )}

          {/* Done / Close Button */}
          <button
            onClick={onClose}
            title="Done drawing (annotations stay visible)"
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              background: '#4EB1CB',
              color: '#000',
              border: 'none',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              marginLeft: '2px',
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
