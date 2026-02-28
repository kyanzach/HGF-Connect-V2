"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

interface UpcomingEvent {
  id: number;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  eventType: string;
  coverPhoto: string | null;
}

interface PrayerSpotlight {
  id: number;
  request: string;
  prayerCount: number;
  author: { firstName: string; lastName: string };
}

interface HeroCarouselProps {
  firstName: string;
}

export default function HeroCarousel({ firstName }: HeroCarouselProps) {
  const [idx, setIdx] = useState(0);
  const [event, setEvent] = useState<UpcomingEvent | null>(null);
  const [prayer, setPrayer] = useState<PrayerSpotlight | null>(null);
  const touchStartX = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Slide renderers ───────────────────────────────────────────────

  const renderWelcome = useCallback(() => {
    return (
      <>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)", margin: 0 }}>
          Welcome back,
        </p>
        <h2 style={{ fontSize: "1.375rem", fontWeight: 800, color: "white", margin: "0.125rem 0 0.625rem" }}>
          {firstName || "Friend"} 🙌
        </h2>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", margin: "0 0 0.875rem", lineHeight: 1.5 }}>
          &ldquo;Give thanks to the Lord, for he is good;&rdquo;
          <br />
          <span style={{ opacity: 0.7 }}>— Psalm 107:1</span>
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link
            href="/devo/new"
            style={{
              background: "white", color: PRIMARY, padding: "0.45rem 1rem",
              borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none",
            }}
          >
            📖 Share Devo
          </Link>
          <Link
            href="/prayer/new"
            style={{
              background: "rgba(255,255,255,0.18)", color: "white", padding: "0.45rem 1rem",
              borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            🙏 Pray
          </Link>
        </div>
      </>
    );
  }, [firstName]);

  const renderEvent = useCallback((ev: UpcomingEvent) => {
    const d = new Date(ev.eventDate);
    const dateStr = isNaN(d.getTime()) 
      ? "Upcoming" 
      : d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
    
    // Robust time parsing
    let startStr = "";
    try {
      const timePart = ev.startTime || "";
      const datePart = ev.eventDate.split("T")[0];
      const combined = timePart.includes("T") ? timePart : `${datePart}T${timePart}`;
      const t = new Date(combined);
      if (!isNaN(t.getTime())) {
        startStr = t.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
      } else {
        startStr = timePart; // fallback to raw string if parsing fails
      }
    } catch {
      startStr = ev.startTime;
    }

    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "1.75rem" }}>📅</span>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Upcoming Event
          </span>
        </div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "white", margin: "0 0 0.375rem", lineHeight: 1.3 }}>
          {ev.title}
        </h2>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.85)", margin: "0 0 0.25rem" }}>
          🗓️ {dateStr}{startStr ? ` · ${startStr}` : ""}
        </p>
        {ev.location && (
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", margin: "0 0 0.625rem" }}>
            📍 {ev.location}
          </p>
        )}
        <Link
          href={`/event/${ev.id}`}
          style={{
            display: "inline-block", background: "white", color: PRIMARY,
            padding: "0.4rem 1rem", borderRadius: "999px", fontSize: "0.8rem",
            fontWeight: 700, textDecoration: "none",
          }}
        >
          View Details →
        </Link>
      </>
    );
  }, []);

  const renderPrayer = useCallback((pr: PrayerSpotlight) => {
    const requestText = pr.request || "";
    const truncated = requestText.length > 100 ? requestText.slice(0, 100) + "…" : requestText;

    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "1.75rem" }}>🙏</span>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Prayer Spotlight
          </span>
        </div>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.9)", margin: "0 0 0.25rem", fontWeight: 600 }}>
          {pr.author?.firstName || "Someone"} {pr.author?.lastName || ""} asks for prayer:
        </p>
        <p style={{ fontSize: "0.85rem", color: "white", margin: "0 0 0.625rem", lineHeight: 1.5, fontStyle: "italic" }}>
          &ldquo;{truncated}&rdquo;
        </p>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Link
            href="/prayer"
            style={{
              background: "white", color: "#7c3aed",
              padding: "0.4rem 1rem", borderRadius: "999px", fontSize: "0.8rem",
              fontWeight: 700, textDecoration: "none",
            }}
          >
            🙏 Pray Now
          </Link>
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)" }}>
            {pr.prayerCount || 0} praying
          </span>
        </div>
      </>
    );
  }, []);

  // Fetch upcoming event + prayer spotlight
  useEffect(() => {
    let mounted = true;
    fetch("/api/events?upcoming=true&limit=1")
      .then((r) => r.json())
      .then((d) => {
        if (mounted && d.events?.[0]) setEvent(d.events[0]);
      })
      .catch(() => {});

    fetch("/api/prayer?tab=active&limit=1")
      .then((r) => r.json())
      .then((d) => {
        if (mounted && d.requests?.[0]) setPrayer(d.requests[0]);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Build slides array — always Welcome first, conditionally add Event + Prayer
  const slides: { key: string; render: () => ReactNode }[] = [
    { key: "welcome", render: renderWelcome },
  ];
  if (event) slides.push({ key: "event", render: () => renderEvent(event) });
  if (prayer) slides.push({ key: "prayer", render: () => renderPrayer(prayer) });

  const total = slides.length;

  // Auto-advance
  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % total);
    }, 4000); // Increased to 4s for better readability
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [total]);

  // Reset idx if slides change and idx is out of bounds
  useEffect(() => {
    if (idx >= total) setIdx(0);
  }, [total, idx]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (total > 1) {
      timerRef.current = setInterval(() => setIdx((i) => (i + 1) % total), 4000);
    }
  }, [total]);

  function prev() { setIdx((i) => (i - 1 + total) % total); resetTimer(); }
  function next() { setIdx((i) => (i + 1) % total); resetTimer(); }

  // ── Main render ───────────────────────────────────────────────────

  return (
    <div
      style={{
        background: (slides[idx]?.key === "event" && event?.coverPhoto)
          ? `url(/uploads/events/${event.coverPhoto}) center/cover no-repeat`
          : `linear-gradient(135deg, #1a7a94 0%, ${PRIMARY} 100%)`,
        padding: "1.125rem 1rem 1.375rem",
        position: "relative",
        overflow: "hidden",
        minHeight: 160,
        borderRadius: "12px",
      }}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || total <= 1) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (dx > 40) prev();
        else if (dx < -40) next();
        touchStartX.current = null;
      }}
    >
      {/* Dark overlay when cover photo is shown */}
      {slides[idx]?.key === "event" && event?.coverPhoto && (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(15,45,61,0.85) 0%, rgba(26,90,118,0.75) 100%)", zIndex: 0 }} />
      )}

      {/* Decorative circles (hidden when cover photo bg) */}
      {!(slides[idx]?.key === "event" && event?.coverPhoto) && (
        <>
          <div style={{ position: "absolute", top: -24, right: -24, width: 96, height: 96, background: "rgba(255,255,255,0.08)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: -16, right: 40, width: 60, height: 60, background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />
        </>
      )}

      {/* Current slide content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {slides[idx]?.render()}
      </div>

      {/* Dot indicators — only show if more than 1 slide */}
      {total > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: "0.875rem", position: "relative", zIndex: 1 }}>
          {slides.map((s, i) => (
            <button
              key={s.key}
              onClick={() => { setIdx(i); resetTimer(); }}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: idx === i ? 18 : 8,
                height: 8,
                borderRadius: 4,
                background: idx === i ? "white" : "rgba(255,255,255,0.4)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s ease",
                WebkitTapHighlightColor: "transparent",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

