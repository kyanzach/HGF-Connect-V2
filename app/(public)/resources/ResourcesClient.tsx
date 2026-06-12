"use client";

import React, { useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";

interface EventResource {
  id: number;
  title: string;
  description: string | null;
  eventDate: string;
  coverPhoto: string | null;
  presentationFile: string | null;
  presentationOriginalName: string | null;
  presentationSlides: string[] | null;
  speaker: string | null;
  commentary: string | null;
}

interface Props {
  events: EventResource[];
}

const PRIMARY = "#4EB1CB";

export default function ResourcesClient({ events }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Carousel states mapped by event ID to allow multiple carousels on the same page
  const [activeSlides, setActiveSlides] = useState<Record<number, number>>({});
  const [lightboxEventId, setLightboxEventId] = useState<number | null>(null);

  const filteredEvents = events.filter((ev) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = ev.title.toLowerCase().includes(query);
    const speakerMatch = ev.speaker ? ev.speaker.toLowerCase().includes(query) : false;
    const descMatch = ev.description ? ev.description.toLowerCase().includes(query) : false;
    const commentaryMatch = ev.commentary ? ev.commentary.toLowerCase().includes(query) : false;
    const dateMatch = new Date(ev.eventDate).toLocaleDateString().toLowerCase().includes(query);
    
    return titleMatch || speakerMatch || descMatch || commentaryMatch || dateMatch;
  });

  const getActiveSlideIndex = (eventId: number) => {
    return activeSlides[eventId] ?? 0;
  };

  const handlePrevSlide = (eventId: number, maxSlides: number) => {
    setActiveSlides((prev) => {
      const current = prev[eventId] ?? 0;
      const next = current > 0 ? current - 1 : maxSlides - 1;
      return { ...prev, [eventId]: next };
    });
  };

  const handleNextSlide = (eventId: number, maxSlides: number) => {
    setActiveSlides((prev) => {
      const current = prev[eventId] ?? 0;
      const next = current < maxSlides - 1 ? current + 1 : 0;
      return { ...prev, [eventId]: next };
    });
  };

  const handleSelectSlide = (eventId: number, index: number) => {
    setActiveSlides((prev) => ({ ...prev, [eventId]: index }));
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px 120px" }}>
      {/* Sticky Premium Search Bar */}
      <div
        style={{
          position: "sticky",
          top: "calc(10px + env(safe-area-inset-top, 0px))",
          zIndex: 50,
          background: "rgba(248, 250, 252, 0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "12px 0",
          marginBottom: "24px",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ position: "relative" }}>
          <input
            id="resources-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search resources by title, speaker, date, or keyword..."
            style={{
              width: "100%",
              padding: "14px 16px 14px 44px",
              borderRadius: "14px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.95rem",
              outline: "none",
              background: "#fff",
              boxSizing: "border-box",
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
            onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
          />
          <div
            style={{
              position: "absolute",
              left: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "1.1rem",
              pointerEvents: "none",
              color: "#94a3b8",
            }}
          >
            🔍
          </div>
          {searchQuery && (
            <button
              id="resources-search-clear"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#64748b",
                fontSize: "0.75rem",
                fontWeight: "bold",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Resource Count indicator */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 700 }}>
          {filteredEvents.length} {filteredEvents.length === 1 ? "Resource" : "Resources"} Available
        </span>
      </div>

      {/* Resources List */}
      {filteredEvents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "white", borderRadius: "20px", border: "1px dashed #cbd5e1" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📖</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: "0 0 6px 0" }}>No Resources Found</h3>
          <p style={{ color: "#64748b", fontSize: "0.88rem", margin: 0 }}>
            Try adjusting your search keywords or browse the active weekly quiz.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {filteredEvents.map((ev) => {
            const slides = ev.presentationSlides;
            const slidesArray = slides
              ? (Array.isArray(slides)
                  ? slides
                  : JSON.parse(JSON.stringify(slides)))
              : [];
            const activeSlide = getActiveSlideIndex(ev.id);

            return (
              <article
                key={ev.id}
                id={`resource-card-${ev.id}`}
                style={{
                  background: "white",
                  borderRadius: "20px",
                  padding: "20px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  border: "1px solid #edf2f7",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {/* Header Information */}
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0", lineHeight: 1.3 }}>
                    {ev.title}
                  </h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", fontSize: "0.8rem", color: "#64748b" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      📅 {new Date(ev.eventDate).toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
                    </span>
                    {ev.speaker && (
                      <>
                        <span>•</span>
                        <span style={{ fontWeight: 700, color: PRIMARY, display: "flex", alignItems: "center", gap: "4px" }}>
                          👤 Speaker: {ev.speaker}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Commentary text details (Full content description / AI lessons summary) */}
                {(ev.commentary || ev.description) && (
                  <div
                    style={{
                      background: "#f8fafc",
                      borderRadius: "14px",
                      padding: "16px",
                      border: "1px solid #edf2f7",
                      fontSize: "0.9rem",
                      color: "#334155",
                      lineHeight: 1.5,
                      maxHeight: "300px",
                      overflowY: "auto",
                    }}
                  >
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "8px", letterSpacing: "0.05em" }}>
                      📝 Sermon Commentary & Spiritual Takeaways
                    </span>
                    {ev.commentary ? (
                      renderFormattedCommentary(ev.commentary)
                    ) : (
                      <p style={{ margin: 0 }}>{ev.description}</p>
                    )}
                  </div>
                )}

                {/* Slide Carousel (Below Text) */}
                {slidesArray.length > 0 && (
                  <div>
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "8px", letterSpacing: "0.05em" }}>
                      📽️ Sermon Slides ({slidesArray.length} slides)
                    </span>
                    
                    {/* Widescreen 16:9 Carousel */}
                    <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#000", borderRadius: "12px", overflow: "hidden" }}>
                      <img
                        src={slidesArray[activeSlide].startsWith("/") ? slidesArray[activeSlide] : `/uploads/presentations/slides/${slidesArray[activeSlide]}`}
                        alt={`${ev.title} Slide ${activeSlide + 1}`}
                        onClick={() => setLightboxEventId(ev.id)}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          cursor: "zoom-in",
                        }}
                      />

                      {/* Overlays arrows */}
                      {slidesArray.length > 1 && (
                        <>
                          <button
                            id={`resource-${ev.id}-prev-slide`}
                            onClick={() => handlePrevSlide(ev.id, slidesArray.length)}
                            style={{
                              position: "absolute",
                              left: "8px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "rgba(0,0,0,0.6)",
                              color: "#fff",
                              border: "none",
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.1rem",
                              cursor: "pointer",
                              zIndex: 10,
                            }}
                          >
                            ◀
                          </button>
                          <button
                            id={`resource-${ev.id}-next-slide`}
                            onClick={() => handleNextSlide(ev.id, slidesArray.length)}
                            style={{
                              position: "absolute",
                              right: "8px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "rgba(0,0,0,0.6)",
                              color: "#fff",
                              border: "none",
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.1rem",
                              cursor: "pointer",
                              zIndex: 10,
                            }}
                          >
                            ▶
                          </button>
                        </>
                      )}

                      {/* Page Counter overlay */}
                      <div style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700 }}>
                        Slide {activeSlide + 1} of {slidesArray.length}
                      </div>
                    </div>

                    {/* Thumbnail strip */}
                    {slidesArray.length > 1 && (
                      <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginTop: "10px", paddingBottom: "6px", scrollBehavior: "smooth" }}>
                        {slidesArray.map((slideName: string, i: number) => (
                          <button
                            key={i}
                            id={`resource-${ev.id}-thumb-${i}`}
                            onClick={() => handleSelectSlide(ev.id, i)}
                            style={{
                              flexShrink: 0,
                              width: "80px",
                              height: "45px",
                              borderRadius: "6px",
                              overflow: "hidden",
                              border: activeSlide === i ? `2px solid ${PRIMARY}` : "2px solid transparent",
                              padding: 0,
                              background: "#000",
                              cursor: "pointer",
                            }}
                          >
                            <img
                              src={slideName.startsWith("/") ? slideName : `/uploads/presentations/slides/${slideName}`}
                              alt={`Thumb ${i + 1}`}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action download buttons */}
                {ev.presentationFile && (
                  <a
                    id={`resource-${ev.id}-download`}
                    href={ev.presentationFile}
                    download
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: PRIMARY,
                      color: "white",
                      padding: "12px 20px",
                      borderRadius: "10px",
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      boxShadow: `0 4px 10px ${PRIMARY}30`,
                      textAlign: "center",
                      transition: "transform 0.1s, opacity 0.2s",
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "none")}
                  >
                    📥 Download Slide Deck (.pptx)
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Lightbox zoom wrapper */}
      {lightboxEventId !== null && (
        <ImageLightbox
          src={(() => {
            const activeEvent = events.find((e) => e.id === lightboxEventId);
            const slides = activeEvent?.presentationSlides;
            const slidesArray = slides ? (Array.isArray(slides) ? slides : JSON.parse(JSON.stringify(slides))) : [];
            const activeSlide = getActiveSlideIndex(lightboxEventId);
            const slideName = slidesArray[activeSlide] || "";
            return slideName.startsWith("/") ? slideName : `/uploads/presentations/slides/${slideName}`;
          })()}
          onClose={() => setLightboxEventId(null)}
          onPrev={() => {
            const activeEvent = events.find((e) => e.id === lightboxEventId);
            const slides = activeEvent?.presentationSlides;
            const slidesArray = slides ? (Array.isArray(slides) ? slides : JSON.parse(JSON.stringify(slides))) : [];
            handlePrevSlide(lightboxEventId, slidesArray.length);
          }}
          onNext={() => {
            const activeEvent = events.find((e) => e.id === lightboxEventId);
            const slides = activeEvent?.presentationSlides;
            const slidesArray = slides ? (Array.isArray(slides) ? slides : JSON.parse(JSON.stringify(slides))) : [];
            handleNextSlide(lightboxEventId, slidesArray.length);
          }}
          currentIndex={getActiveSlideIndex(lightboxEventId)}
          totalSlides={(() => {
            const activeEvent = events.find((e) => e.id === lightboxEventId);
            const slides = activeEvent?.presentationSlides;
            return slides ? (Array.isArray(slides) ? slides : JSON.parse(JSON.stringify(slides))).length : 0;
          })()}
        />
      )}
    </div>
  );
}

// ── Markdown Commentary Renderer ──
function renderFormattedCommentary(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    let cleanLine = line.trim();
    if (!cleanLine) return <div key={idx} style={{ height: "12px" }} />;

    if (cleanLine.startsWith("###")) {
      return (
        <h4 key={idx} style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", marginTop: "14px", marginBottom: "6px" }}>
          {cleanLine.replace("###", "").trim()}
        </h4>
      );
    }
    if (cleanLine.startsWith("##")) {
      return (
        <h3 key={idx} style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginTop: "18px", marginBottom: "8px" }}>
          {cleanLine.replace("##", "").trim()}
        </h3>
      );
    }
    if (cleanLine.startsWith("#")) {
      return (
        <h2 key={idx} style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginTop: "22px", marginBottom: "10px" }}>
          {cleanLine.replace("#", "").trim()}
        </h2>
      );
    }

    if (cleanLine.startsWith("* ") || cleanLine.startsWith("- ")) {
      const bulletText = cleanLine.substring(2).trim();
      return (
        <li key={idx} style={{ marginLeft: "14px", marginBottom: "4px", fontSize: "0.85rem", color: "#475569", lineHeight: 1.45 }}>
          {parseBoldText(bulletText)}
        </li>
      );
    }

    return (
      <p key={idx} style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.45, margin: "0 0 8px 0" }}>
        {parseBoldText(cleanLine)}
      </p>
    );
  });
}

function parseBoldText(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} style={{ fontWeight: 700, color: "#0f172a" }}>{part}</strong>;
    }
    return part;
  });
}
