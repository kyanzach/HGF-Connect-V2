"use client";

/**
 * NavigationProgress — Global top-of-screen progress bar.
 *
 * Shows a thin teal animated bar whenever a route change is in progress.
 * Like YouTube / GitHub / Instagram — the single most impactful UX signal
 * that tells the user "your tap was registered, we're loading".
 *
 * Uses Next.js `usePathname()` to detect route changes.
 * Positioned at the absolute top of the viewport, above the header.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const PRIMARY = "#4EB1CB";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname);
  const prevSearch = useRef(searchParams?.toString() ?? "");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When pathname or searchParams change, the new route has loaded → finish
  useEffect(() => {
    const currentSearch = searchParams?.toString() ?? "";
    if (pathname !== prevPath.current || currentSearch !== prevSearch.current) {
      prevPath.current = pathname;
      prevSearch.current = currentSearch;

      if (loading) {
        // Route arrived — quickly finish the bar
        setProgress(100);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        hideTimerRef.current = setTimeout(() => {
          setVisible(false);
          setLoading(false);
          setProgress(0);
        }, 300);
      }
    }
  }, [pathname, searchParams, loading]);

  // Listen to click events on links to START the progress bar
  const handleClick = useCallback((e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    // Skip external links, anchors, api calls, same-page
    if (
      href.startsWith("http") ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.includes("/api/")
    ) {
      return;
    }

    // Skip if cmd/ctrl/shift click (new tab)
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;

    // Skip downloads
    if (anchor.hasAttribute("download")) return;

    // Check if this navigates to a different page
    const targetPath = href.split("?")[0].split("#")[0];
    const currentPath = window.location.pathname;
    const targetSearch = href.includes("?") ? href.split("?")[1]?.split("#")[0] : "";
    const currentSearch = window.location.search.replace("?", "");

    if (targetPath === currentPath && targetSearch === currentSearch) return;

    // Start progress!
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setLoading(true);
    setVisible(true);
    setProgress(15);

    // Gradually increment progress to simulate loading
    if (timerRef.current) clearInterval(timerRef.current);
    let p = 15;
    timerRef.current = setInterval(() => {
      p += Math.random() * 8 + 2;
      if (p > 92) {
        p = 92;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
      setProgress(p);
    }, 300);
  }, []);

  useEffect(() => {
    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [handleClick]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 999999,
        pointerEvents: "none",
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${PRIMARY}, #7ec8da, ${PRIMARY})`,
          backgroundSize: "200% 100%",
          animation: "hgf-skeleton-shimmer 1s linear infinite",
          transition: progress === 100 ? "width 0.2s ease" : "width 0.3s ease-out",
          boxShadow: `0 0 8px ${PRIMARY}80, 0 0 2px ${PRIMARY}40`,
          borderRadius: "0 2px 2px 0",
        }}
      />
      {/* Glow dot at the end */}
      {progress < 100 && (
        <div
          style={{
            position: "absolute",
            right: `${100 - progress}%`,
            top: -1,
            width: 20,
            height: 5,
            background: `radial-gradient(ellipse, ${PRIMARY}90, transparent)`,
            borderRadius: "50%",
          }}
        />
      )}
    </div>
  );
}
