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

  // Two-finger panning state & gesture cooldown
  const panStartYRef = useRef<number>(0);
  const panStartXRef = useRef<number>(0);
  const lastMidYRef = useRef<number>(0);
  const lastMidXRef = useRef<number>(0);
  const panCooldownUntilRef = useRef<number>(0);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollVelocityYRef = useRef<number>(0);
  const momentumRafRef = useRef<number | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const stopMomentum = useCallback(() => {
    if (momentumRafRef.current) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
  }, []);

  const isMd = Boolean(
    (currentUser?.role || '').toUpperCase() === 'MD' ||
    (currentUser?.username || '').toLowerCase() === 'ren' ||
    (currentUser?.username || '').toLowerCase().includes('ren') ||
    (currentUser?.displayName || '').toLowerCase().includes('(md)') ||
    ((currentUser as any)?.aliases || []).some((a: string) => a.toLowerCase().includes('ren'))
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync strokes from props when not actively in the middle of a stroke
  useEffect(() => {
    if (!isDrawing.current && Array.isArray(savedStrokes)) {
      setStrokes(savedStrokes);
    }
  }, [savedStrokes]);

  // Determine which strokes are visible based on MD global authority and user-level scope
  const getVisibleStrokes = useCallback(() => {
    return strokes.filter((s) => {
      // 1. Global strokes created by MD (or role MD) are visible to everyone
      if (s.scope === 'global' || s.role === 'MD') return true;

      // 2. Personal user-level strokes: ONLY visible to the current author
      if (currentUser?.id && s.userId === currentUser.id) return true;

      // 3. Fallback for guest mode if not logged in
      if (!currentUser?.id && (s.userId === 'guest' || !s.userId)) return true;

      return false;
    });
  }, [strokes, currentUser]);

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

    // Anchor resolver: translates musical section & line coordinates to live screen pixels
    const resolvePointCoords = (p: DrawingPoint) => {
      if (p.lineIdx !== undefined) {
        const lineEl = document.getElementById(`sheet-line-${p.lineIdx}`);
        if (lineEl) {
          const lRect = lineEl.getBoundingClientRect();
          const liveX = (lRect.left - rect.left) + (p.relX !== undefined ? p.relX * lRect.width : 0);
          const liveY = (lRect.top - rect.top) + (p.relY !== undefined ? p.relY : 0);
          return { x: liveX, y: liveY };
        }
      }

      if (p.nx !== undefined && p.ny !== undefined) {
        return { x: p.nx * cssW, y: p.ny * cssH };
      }

      return { x: p.x || 0, y: p.y || 0 };
    };

    visibleList.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;

      const p0 = resolvePointCoords(stroke.points[0]);
      const p0x = p0.x;
      const p0y = p0.y;

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
        const p1 = resolvePointCoords(stroke.points[1]);
        ctx.lineTo(p1.x, p1.y);
      } else {
        // Smooth quadratic bezier curves for natural fluid strokes
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const pt = resolvePointCoords(stroke.points[i]);
          const next = resolvePointCoords(stroke.points[i + 1]);

          const midX = (pt.x + next.x) / 2;
          const midY = (pt.y + next.y) / 2;

          ctx.quadraticCurveTo(pt.x, pt.y, midX, midY);
        }
        const last = resolvePointCoords(stroke.points[stroke.points.length - 1]);
        ctx.lineTo(last.x, last.y);
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
    let mo: MutationObserver | null = null;
    if (wrapper) {
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          updateCanvasSize();
        });
        ro.observe(wrapper);
        // Observe direct children so dynamically loaded lyrics/sections immediately resize canvas
        Array.from(wrapper.children).forEach((child) => {
          if (child !== canvasRef.current) {
            ro?.observe(child);
          }
        });
      }
      if (typeof MutationObserver !== 'undefined') {
        mo = new MutationObserver(() => {
          updateCanvasSize();
        });
        mo.observe(wrapper, { childList: true, subtree: true });
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (ro) ro.disconnect();
      if (mo) mo.disconnect();
    };
  }, [updateCanvasSize, containerRef]);

  // Whenever isActive changes to true, ensure dimensions & redraw
  useEffect(() => {
    if (isActive) {
      updateCanvasSize();
      redraw();
      const t1 = setTimeout(updateCanvasSize, 50);
      const t2 = setTimeout(updateCanvasSize, 200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isActive, updateCanvasSize, redraw]);

  // Precise coordinate mapping in CSS pixels with musical section & line anchoring
  const getCanvasCoords = useCallback((clientX: number, clientY: number): DrawingPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, nx: 0, ny: 0 };

    const rect = canvas.getBoundingClientRect();
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;

    const cssW = Math.max(rect.width, 1);
    const cssH = Math.max(rect.height, 1);

    const clampedNx = Math.max(0, Math.min(1, cssX / cssW));
    const clampedNy = Math.max(0, Math.min(1, cssY / cssH));

    // Find the sheet line (.hgf-sheet-line) under or closest to this point
    let lineIdx: number | undefined = undefined;
    let sectionName: string | undefined = undefined;
    let relX: number | undefined = undefined;
    let relY: number | undefined = undefined;

    const lineElements = document.querySelectorAll<HTMLElement>('.hgf-sheet-line');
    for (let i = 0; i < lineElements.length; i++) {
      const el = lineElements[i];
      const lRect = el.getBoundingClientRect();
      if (clientY >= lRect.top - 6 && clientY <= lRect.bottom + 6) {
        const parsedIdx = el.dataset.sheetLineIndex ? parseInt(el.dataset.sheetLineIndex, 10) : undefined;
        if (parsedIdx !== undefined && !isNaN(parsedIdx)) {
          lineIdx = parsedIdx;
          sectionName = el.dataset.sectionName || undefined;
          relX = Math.max(0, Math.min(1, (clientX - lRect.left) / Math.max(lRect.width, 1)));
          relY = clientY - lRect.top;
          break;
        }
      }
    }

    return {
      x: Math.round(cssX),
      y: Math.round(cssY),
      nx: clampedNx,
      ny: clampedNy,
      lineIdx,
      sectionName,
      relX,
      relY,
    };
  }, []);

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
          if (!isMd && (s.scope === 'global' || s.role === 'MD')) return true;
          if (!isMd && s.userId !== currentUser?.id && s.userId !== 'guest') return true;

          const hit = s.points.some((p) => {
            let px = p.x;
            let py = p.y;
            if (p.lineIdx !== undefined) {
              const lineEl = document.getElementById(`sheet-line-${p.lineIdx}`);
              if (lineEl) {
                const lRect = lineEl.getBoundingClientRect();
                px = (lRect.left - rect.left) + (p.relX !== undefined ? p.relX * lRect.width : 0);
                py = (lRect.top - rect.top) + (p.relY !== undefined ? p.relY : 0);
              }
            } else if (p.nx !== undefined && p.ny !== undefined) {
              px = p.nx * cssW;
              py = p.ny * cssH;
            }
            return Math.hypot((px ?? 0) - pos.x, (py ?? 0) - pos.y) < thresholdCss;
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
    [currentUser, isMd, onSaveStrokes]
  );

  // Draw dot directly on canvas
  const drawDotOnCanvas = useCallback(
    (pos: DrawingPoint) => {
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
    },
    [color, lineWidth]
  );

  // Draw segment directly on canvas during stroke
  const drawSegmentOnCanvas = useCallback(
    (prev: DrawingPoint | undefined, curr: DrawingPoint) => {
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
    },
    [color, lineWidth]
  );

  // Commit current stroke
  const commitCurrentStroke = useCallback(() => {
    if (currentPoints.current.length === 0) return;

    const newStroke: DrawingStroke = {
      color,
      width: lineWidth,
      points: [...currentPoints.current],
      scope: isMd ? 'global' : 'user',
      userId: currentUser?.id || 'guest',
      authorName: currentUser?.displayName || (isMd ? 'Ren (MD)' : (currentUser?.role === 'admin' ? 'Ryan (Admin)' : 'Musician')),
      role: currentUser?.role || 'member',
      timestamp: Date.now(),
    };

    setStrokes((prev) => {
      const updated = [...prev, newStroke];
      if (onSaveStrokes) onSaveStrokes(updated);
      return updated;
    });

    currentPoints.current = [];
  }, [color, lineWidth, isMd, currentUser, onSaveStrokes]);

  // ── Native Two-Finger Scroll & Multi-Touch Gesture Engine (iOS & Android) ─
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;

    const onNativeTouchStart = (e: TouchEvent) => {
      stopMomentum();

      try {
        if (typeof window !== 'undefined' && (window as any).AndroidBand?.setSwipeRefreshEnabled) {
          (window as any).AndroidBand.setSwipeRefreshEnabled(false);
        }
      } catch (_) {}

      const touches = e.touches;
      if (touches.length >= 2) {
        // TWO OR MORE FINGERS: Enter 2-Finger Scroll / Pan Mode immediately!
        e.preventDefault();
        e.stopPropagation();

        isPanning.current = true;

        // If Finger 1 started drawing in the milliseconds before Finger 2 landed,
        // instantly abort the stroke, discard temporary points, and clean the canvas!
        if (isDrawing.current) {
          isDrawing.current = false;
          currentPoints.current = [];
          redraw();
        }

        // Release any pointer capture held by the single finger
        if (activePointerIdRef.current !== null) {
          try {
            canvas.releasePointerCapture(activePointerIdRef.current);
          } catch (_) {}
          activePointerIdRef.current = null;
        }

        const midY = (touches[0].clientY + touches[1].clientY) / 2;
        const midX = (touches[0].clientX + touches[1].clientX) / 2;
        panStartYRef.current = midY;
        panStartXRef.current = midX;
        lastMidYRef.current = midY;
        lastMidXRef.current = midX;
        lastScrollTimeRef.current = performance.now();
        scrollVelocityYRef.current = 0;
        return;
      }

      if (isPanning.current || Date.now() < panCooldownUntilRef.current) {
        // Still cooling down from a two-finger scroll gesture
        e.preventDefault();
      }
    };

    const onNativeTouchMove = (e: TouchEvent) => {
      const touches = e.touches;

      if (touches.length >= 2) {
        // Two-finger scroll in progress
        e.preventDefault();
        e.stopPropagation();

        isPanning.current = true;
        if (isDrawing.current) {
          isDrawing.current = false;
          currentPoints.current = [];
          redraw();
        }

        const midY = (touches[0].clientY + touches[1].clientY) / 2;
        const midX = (touches[0].clientX + touches[1].clientX) / 2;

        if (!lastMidYRef.current) lastMidYRef.current = midY;
        if (!lastMidXRef.current) lastMidXRef.current = midX;

        const deltaY = midY - lastMidYRef.current;
        const deltaX = midX - lastMidXRef.current;

        const now = performance.now();
        const dt = Math.max(1, now - (lastScrollTimeRef.current || now));
        scrollVelocityYRef.current = deltaY / dt;
        lastScrollTimeRef.current = now;

        lastMidYRef.current = midY;
        lastMidXRef.current = midX;

        const wrapper = containerRef?.current || document.getElementById('sheetWrapper');
        if (wrapper && !isNaN(deltaY)) {
          const maxScroll = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);
          wrapper.scrollTop = Math.max(0, Math.min(maxScroll, wrapper.scrollTop - deltaY));

          if (!isNaN(deltaX)) {
            const maxScrollX = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
            wrapper.scrollLeft = Math.max(0, Math.min(maxScrollX, wrapper.scrollLeft - deltaX));
          }
        }
        return;
      }

      // If user was panning with 2 fingers, and 1 finger lifts before the other,
      // prevent the remaining moving finger from drawing!
      if (isPanning.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onNativeTouchEnd = (e: TouchEvent) => {
      const touches = e.touches;

      if (isPanning.current) {
        if (touches.length === 0) {
          // Both fingers lifted - finish panning gesture
          isPanning.current = false;
          lastMidYRef.current = 0;
          lastMidXRef.current = 0;
          panCooldownUntilRef.current = Date.now() + 200; // 200ms cooldown to reject lingering finger lifts

          // Smooth inertia glide
          const initialVelocity = scrollVelocityYRef.current;
          if (Math.abs(initialVelocity) > 0.12) {
            let vel = initialVelocity * 13;
            const applyMomentum = () => {
              if (Math.abs(vel) < 0.5 || isDrawing.current || isPanning.current) return;
              const wrapper = containerRef?.current || document.getElementById('sheetWrapper');
              if (wrapper) {
                const maxScroll = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);
                wrapper.scrollTop = Math.max(0, Math.min(maxScroll, wrapper.scrollTop - vel));
              }
              vel *= 0.92;
              momentumRafRef.current = requestAnimationFrame(applyMomentum);
            };
            momentumRafRef.current = requestAnimationFrame(applyMomentum);
          }

          // Ensure canvas spans any newly scrolled sections
          updateCanvasSize();
        } else {
          // 1 finger still on glass during 2-finger release: keep panning flag true
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const onNativeTouchCancel = () => {
      isPanning.current = false;
      lastMidYRef.current = 0;
      lastMidXRef.current = 0;
      panCooldownUntilRef.current = Date.now() + 200;
    };

    canvas.addEventListener('touchstart', onNativeTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    canvas.addEventListener('touchend', onNativeTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onNativeTouchCancel, { passive: false });

    return () => {
      stopMomentum();
      canvas.removeEventListener('touchstart', onNativeTouchStart);
      canvas.removeEventListener('touchmove', onNativeTouchMove);
      canvas.removeEventListener('touchend', onNativeTouchEnd);
      canvas.removeEventListener('touchcancel', onNativeTouchCancel);
    };
  }, [isActive, containerRef, redraw, stopMomentum, updateCanvasSize]);

  // ── High-Performance Pointer Events (Pen, Stylus, Mouse, Desktop Touch) ─
  const activePointerIdRef = useRef<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Check if currently panning or cooling down from a 2-finger scroll
    if (isPanning.current || Date.now() < panCooldownUntilRef.current) {
      return;
    }

    // Stop any coasting inertia
    stopMomentum();

    // Track pointer in multi-touch registry
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-pointer fallback (for desktop touchscreens / Chrome emulation)
    if (activePointersRef.current.size >= 2) {
      isPanning.current = true;
      if (isDrawing.current) {
        isDrawing.current = false;
        currentPoints.current = [];
        redraw();
      }
      if (activePointerIdRef.current !== null) {
        try {
          e.currentTarget.releasePointerCapture(activePointerIdRef.current);
        } catch (_) {}
        activePointerIdRef.current = null;
      }
      const pts = Array.from(activePointersRef.current.values());
      lastMidYRef.current = (pts[0].y + pts[1].y) / 2;
      lastMidXRef.current = (pts[0].x + pts[1].x) / 2;
      return;
    }

    // Palm / Secondary touch rejection: if already drawing, ignore additional touches
    if (activePointerIdRef.current !== null) {
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    activePointerIdRef.current = e.pointerId;
    isDrawing.current = true;

    // Ensure canvas spans any newly scrolled sections
    const wrapper = containerRef?.current || document.getElementById('sheetWrapper');
    if (wrapper && canvasRef.current) {
      const requiredH = Math.max(wrapper.scrollHeight, wrapper.clientHeight);
      if (requiredH > (canvasRef.current.clientHeight || 0) + 10) {
        updateCanvasSize();
      }
    }

    const pos = getCanvasCoords(e.clientX, e.clientY);

    if (isEraser) {
      eraseStrokesAt(pos);
    } else {
      currentPoints.current = [pos];
      drawDotOnCanvas(pos);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (isPanning.current || activePointersRef.current.size >= 2) {
      if (activePointersRef.current.size >= 2) {
        const pts = Array.from(activePointersRef.current.values());
        const midY = (pts[0].y + pts[1].y) / 2;
        const midX = (pts[0].x + pts[1].x) / 2;

        if (!lastMidYRef.current) lastMidYRef.current = midY;
        if (!lastMidXRef.current) lastMidXRef.current = midX;

        const deltaY = midY - lastMidYRef.current;
        const deltaX = midX - lastMidXRef.current;

        lastMidYRef.current = midY;
        lastMidXRef.current = midX;

        const wrapper = containerRef?.current || document.getElementById('sheetWrapper');
        if (wrapper && !isNaN(deltaY)) {
          const maxScroll = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);
          wrapper.scrollTop = Math.max(0, Math.min(maxScroll, wrapper.scrollTop - deltaY));
          if (!isNaN(deltaX)) {
            const maxScrollX = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
            wrapper.scrollLeft = Math.max(0, Math.min(maxScrollX, wrapper.scrollLeft - deltaX));
          }
        }
      }
      return;
    }

    if (!isDrawing.current) return;
    if (e.pointerId !== activePointerIdRef.current) return;

    const pos = getCanvasCoords(e.clientX, e.clientY);

    if (isEraser) {
      eraseStrokesAt(pos);
    } else {
      const prev = currentPoints.current[currentPoints.current.length - 1];
      currentPoints.current.push(pos);
      drawSegmentOnCanvas(prev, pos);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;

    activePointersRef.current.delete(e.pointerId);

    if (e.pointerId === activePointerIdRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      activePointerIdRef.current = null;
    }

    if (activePointersRef.current.size === 0 && isPanning.current) {
      isPanning.current = false;
      lastMidYRef.current = 0;
      lastMidXRef.current = 0;
      panCooldownUntilRef.current = Date.now() + 200;
      updateCanvasSize();
      return;
    }

    if (isPanning.current) return;
    if (!isDrawing.current) return;

    isDrawing.current = false;

    if (!isEraser && currentPoints.current.length > 0) {
      commitCurrentStroke();
    }
    currentPoints.current = [];
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;

    activePointersRef.current.delete(e.pointerId);

    if (e.pointerId === activePointerIdRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      activePointerIdRef.current = null;
    }

    if (isPanning.current) {
      isDrawing.current = false;
      currentPoints.current = [];
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    // Retain drawn points even if Android/OS issues pointercancel (e.g. edge swipe)
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
    stopMomentum();
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
      if (isMd) {
        targetIndex = i;
        break;
      } else if (s.userId === currentUser?.id || (!s.userId && s.scope === 'user')) {
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
    const updated = isMd
      ? []
      : strokes.filter((s) => s.scope === 'global' || s.role === 'MD' || (s.userId !== currentUser?.id && s.userId !== 'guest'));

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
          backgroundColor: isMd ? 'rgba(78, 177, 203, 0.2)' : 'rgba(234, 179, 8, 0.15)',
          color: isMd ? '#4EB1CB' : '#facc15',
          border: `1px solid ${isMd ? 'rgba(78, 177, 203, 0.4)' : 'rgba(234, 179, 8, 0.3)'}`,
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <span>{isMd ? '🌐 GLOBAL (MD)' : '🔒 PERSONAL'}</span>
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: isActive ? 'auto' : 'none',
          zIndex: 15,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
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
