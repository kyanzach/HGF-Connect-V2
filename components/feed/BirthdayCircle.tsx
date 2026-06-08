"use client";

import { useState } from "react";

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
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  if (celebrants.length === 0) return null;

  // Orbit radius in pixels
  const radius = 68;
  const angle = (2 * Math.PI) / celebrants.length;

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: 220,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      background: "linear-gradient(to bottom, #f0fdfa, #fcfcfc)",
      borderRadius: "16px",
      border: "1px solid #ccfbf1",
      marginTop: "12px",
    }}>
      <style>{`
        .hgf-orbit-container {
          position: absolute;
          width: 200px;
          height: 200px;
          display: flex;
          alignItems: center;
          justifyContent: center;
          animation: hgf-orbit 25s linear infinite;
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
              onMouseEnter={() => setHoveredName(c.name)}
              onMouseLeave={() => setHoveredName(null)}
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
      }}>
        {hoveredName ? (
          <span style={{
            fontSize: "0.72rem",
            fontWeight: 800,
            color: "#b45309",
            wordBreak: "break-word",
            lineHeight: 1.1,
            animation: "fadeIn 0.15s ease-out",
          }}>
            {hoveredName}
          </span>
        ) : (
          <>
            <span style={{ fontSize: "1.5rem", display: "block", marginBottom: 2 }}>🎂</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#1e293b", textTransform: "uppercase" }}>
              {month}
            </span>
          </>
        )}
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
