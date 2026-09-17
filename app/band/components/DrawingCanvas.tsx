// app/band/components/DrawingCanvas.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DrawingStroke, DrawingPoint } from '../types/band';

interface DrawingCanvasProps {
  isActive: boolean;
  onClose: () => void;
  savedStrokes?: DrawingStroke[];
  onSaveStrokes?: (strokes: DrawingStroke[]) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  isActive,
  onClose,
  savedStrokes = [],
  onSaveStrokes,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<DrawingStroke[]>(savedStrokes);
  const [color, setColor] = useState<string>('#facc15');
  const [lineWidth, setLineWidth] = useState<number>(4);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const isDrawing = useRef<boolean>(false);
  const currentPoints = useRef<DrawingPoint[]>([]);

  useEffect(() => {
    setStrokes(savedStrokes || []);
  }, [savedStrokes]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Use normalized coordinates scaled to current canvas width/height
      const p0 = stroke.points[0];
      ctx.moveTo(p0.nx * canvas.width, p0.ny * canvas.height);

      for (let i = 1; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        ctx.lineTo(p.nx * canvas.width, p.ny * canvas.height);
      }
      ctx.stroke();
    });
  }, [strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Resize canvas to match window
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redraw();
    };

    if (isActive) {
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isActive, redraw]);

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
    const nx = x / canvas.width;
    const ny = y / canvas.height;

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
    const nx = x / canvas.width;
    const ny = y / canvas.height;

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
      };
      const updated = [...strokes, newStroke];
      setStrokes(updated);
      if (onSaveStrokes) onSaveStrokes(updated);
    }
    currentPoints.current = [];
  };

  const undo = () => {
    if (strokes.length === 0) return;
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    if (onSaveStrokes) onSaveStrokes(updated);
  };

  const clearAll = () => {
    setStrokes([]);
    if (onSaveStrokes) onSaveStrokes([]);
  };

  if (!isActive) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 70,
          touchAction: 'none',
          cursor: isEraser ? 'cell' : 'crosshair',
        }}
      />

      {/* DRAWING TOOLBAR */}
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
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          userSelect: 'none',
        }}
      >
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
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: item.c,
              border: color === item.c && !isEraser ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              transform: color === item.c && !isEraser ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.1s ease',
            }}
          />
        ))}

        <div style={{ width: '1px', height: '20px', backgroundColor: '#334155', margin: '0 4px' }} />

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
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
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
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ↶ Undo
        </button>

        {/* Clear */}
        <button
          onClick={clearAll}
          title="Clear all annotations"
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          🗑️ Clear
        </button>

        {/* Done / Close */}
        <button
          onClick={onClose}
          title="Done annotating"
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            background: '#4EB1CB',
            color: '#000',
            border: 'none',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            marginLeft: '4px',
          }}
        >
          Done
        </button>
      </div>
    </>
  );
};
