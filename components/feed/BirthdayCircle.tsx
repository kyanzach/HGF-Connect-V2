"use client";
import { useState, useEffect } from "react";

interface Celebrant {
  id: number;
  name: string;
  profilePicture: string | null;
}

interface BirthdayCircleProps {
  month: string;
  celebrants: Celebrant[];
}

const PRIMARY = "#4EB1CB";

export default function BirthdayCircle({ month, celebrants }: BirthdayCircleProps) {
  const [activeCelebrant, setActiveCelebrant] = useState<Celebrant | null>(null);
  const [particles, setParticles] = useState<{ id: number; style: React.CSSProperties; content: string }[]>([]);

  useEffect(() => {
    const newParticles = [];
    const emojis = ["🎈", "🥳", "🎉", "🎁", "✨", "🍰"];
    const colors = ["#4EB1CB", "#FFD700", "#FF6B6B", "#48BB78", "#9F7AEA", "#F687B3", "#ef4444", "#3b82f6"];

    // Confetti falling
    for (let i = 0; i < 20; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 5;
      const duration = 3 + Math.random() * 3;
      const size = 5 + Math.random() * 5;
      const isRound = Math.random() > 0.5;
      const color = colors[Math.floor(Math.random() * colors.length)];

      newParticles.push({
        id: i,
        content: "",
        style: {
          position: "absolute" as const,
          left: `${left}%`,
          top: -20,
          width: `${size}px`,
          height: isRound ? `${size}px` : `${size * 1.5}px`,
          borderRadius: isRound ? "50%" : "2px",
          background: color,
          animationName: "hgf-confetti-fall",
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          animationIterationCount: "infinite",
          animationTimingFunction: "linear",
          opacity: 0,
          zIndex: 1,
          pointerEvents: "none" as const,
        }
      });
    }

    // Emojis floating
    for (let i = 0; i < 8; i++) {
      const left = 5 + Math.random() * 90;
      const delay = Math.random() * 6;
      const duration = 5 + Math.random() * 5;
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const fontSize = 14 + Math.random() * 10;

      newParticles.push({
        id: 100 + i,
        content: emoji,
        style: {
          position: "absolute" as const,
          left: `${left}%`,
          bottom: -30,
          fontSize: `${fontSize}px`,
          animationName: "hgf-emoji-float",
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          animationIterationCount: "infinite",
          animationTimingFunction: "ease-in-out",
          opacity: 0,
          pointerEvents: "none" as const,
          userSelect: "none" as const,
          zIndex: 1,
        }
      });
    }

    setParticles(newParticles);
  }, []);

  if (celebrants.length === 0) return null;

  // Orbit radius in pixels
  const radius = 68;
  const angle = (2 * Math.PI) / celebrants.length;

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: 240,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      background: "linear-gradient(to bottom, #f0fdfa, #fcfcfc)",
      borderRadius: "16px",
      border: "1px solid #ccfbf1",
      marginTop: "12px",
    }}>
      {/* Animating celebration particles background */}
      {particles.map((p) => (
        <div key={p.id} style={p.style}>
          {p.content}
        </div>
      ))}

      <style>{`
        .hgf-orbit-container {
          position: absolute;
          width: 200px;
          height: 200px;
          display: flex;
          alignItems: center;
          justifyContent: center;
          animation: hgf-orbit 25s linear infinite;
          z-index: 2;
        }
        .hgf-orbit-container:hover {
          animation-play-state: paused;
        }
        .hgf-orbit-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.12);
          background: ${PRIMARY};
          overflow: hidden;
          display: flex;
          alignItems: center;
          justifyContent: center;
          animation: hgf-counter-orbit 25s linear infinite;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
        }
        .hgf-orbit-avatar:hover {
          transform: scale(1.25);
          border-color: #f59e0b;
          box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
        }
        .hgf-orbit-container:hover .hgf-orbit-avatar {
          animation-play-state: paused;
        }
        @keyframes hgf-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes hgf-counter-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes hgf-confetti-fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(260px) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes hgf-emoji-float {
          0% {
            transform: translateY(260px) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.7;
          }
          85% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-40px) scale(1.1) rotate(15deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Orbit Ring */}
      <div className="hgf-orbit-container">
        {celebrants.map((c, index) => {
          // Circular coordinate calculation
          const x = Math.sin(index * angle) * radius;
          const y = -Math.cos(index * angle) * radius;
          const initials = c.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

          return (
            <div
              key={c.id}
              className="hgf-orbit-avatar"
              style={{
                position: "absolute",
                left: `calc(50% + ${x}px - 22px)`,
                top: `calc(50% + ${y}px - 22px)`,
              }}
              onMouseEnter={() => setActiveCelebrant(c)}
              onMouseLeave={() => setActiveCelebrant(null)}
              onClick={() => setActiveCelebrant(c)}
            >
              {c.profilePicture ? (
                <img
                  src={c.profilePicture.startsWith("/") ? c.profilePicture : `/uploads/profile_pictures/${c.profilePicture}`}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "white" }}>
                  {initials}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Central Birthday Cake Centerpiece */}
      <div style={{
        width: 82,
        height: 82,
        borderRadius: "50%",
        background: "#fffbeb",
        border: "3.5px solid #f59e0b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 18px rgba(245, 158, 11, 0.15)",
        textAlign: "center",
        zIndex: 10,
        padding: "6px",
        boxSizing: "border-box",
        transition: "all 0.2s ease-out",
        position: "relative",
        overflow: "hidden",
      }}>
        {activeCelebrant ? (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
            animation: "fadeIn 0.15s ease-out",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fffbeb",
          }}>
            {activeCelebrant.profilePicture ? (
              <img
                src={activeCelebrant.profilePicture.startsWith("/") ? activeCelebrant.profilePicture : `/uploads/profile_pictures/${activeCelebrant.profilePicture}`}
                alt={activeCelebrant.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: "1.4rem", fontWeight: 800, color: PRIMARY }}>
                {activeCelebrant.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </span>
            )}
          </div>
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}>
            <span style={{ fontSize: "1.5rem", display: "block", marginBottom: 2 }}>🎂</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#1e293b", textTransform: "uppercase" }}>
              {month}
            </span>
          </div>
        )}
      </div>

      {/* Name banner below the circles */}
      <div style={{
        position: "absolute",
        bottom: "12px",
        left: 0,
        right: 0,
        textAlign: "center",
        zIndex: 15,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "24px",
      }}>
        <span style={{
          fontSize: "0.85rem",
          fontWeight: 800,
          color: activeCelebrant ? "#b45309" : "#64748b",
          transition: "all 0.2s ease",
          background: activeCelebrant ? "#fffbeb" : "rgba(255, 255, 255, 0.4)",
          padding: "3px 12px",
          borderRadius: "999px",
          border: `1px solid ${activeCelebrant ? "#fde68a" : "rgba(204, 251, 241, 0.5)"}`,
          boxShadow: activeCelebrant ? "0 2px 6px rgba(245, 158, 11, 0.08)" : "none",
          animation: activeCelebrant ? "fadeIn 0.15s ease-out" : "none",
        }}>
          {activeCelebrant ? activeCelebrant.name : `🎂 ${month} Celebrants`}
        </span>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
