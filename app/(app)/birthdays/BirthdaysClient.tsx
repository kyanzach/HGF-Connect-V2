"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BirthdayCircle from "@/components/feed/BirthdayCircle";

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  coverPhoto: string | null;
  birthdate: string;
  birthMonth: number;
  birthDay: number;
}

const PRIMARY = "#4EB1CB";
const GOLD = "#f59e0b";

export default function BirthdaysClient({ initialMembers }: { initialMembers: any[] }) {
  const router = useRouter();

  // Current month in Manila Time
  const now = new Date();
  const manilaStr = now.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaDate = new Date(manilaStr);
  const currentMonthNum = manilaDate.getMonth() + 1; // 1-12

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const parsedMembers: Member[] = initialMembers.map((m) => {
    const birth = new Date(m.birthdate);
    const month = birth.getUTCMonth() + 1;
    const day = birth.getUTCDate();

    let resolvedPic = null;
    if (m.profilePicture) {
      resolvedPic = `/uploads/profile_pictures/${m.profilePicture}`;
    } else if (m.coverPhoto) {
      resolvedPic = `/uploads/cover_photos/${m.coverPhoto}`;
    }

    return {
      ...m,
      birthMonth: month,
      birthDay: day,
      profilePicture: resolvedPic,
    };
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);

  // Month tab list
  const monthNums = Array.from({ length: 12 }, (_, i) => i + 1);

  const activeCelebrants = parsedMembers
    .filter((m) => m.birthMonth === selectedMonth)
    .sort((a, b) => a.birthDay - b.birthDay);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "1rem" }}>
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, #2d8fa6 0%, #4EB1CB 100%)",
        borderRadius: "16px",
        padding: "1.5rem",
        color: "white",
        textAlign: "center",
        marginBottom: "1.5rem",
        boxShadow: "0 4px 12px rgba(78, 177, 203, 0.15)",
        position: "relative"
      }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 4px 0", letterSpacing: "-0.01em" }}>
          🎂 HGF Celebrants
        </h1>
        <p style={{ fontSize: "0.85rem", opacity: 0.9, margin: 0 }}>
          Celebrating the gift of life in our fellowship
        </p>
      </div>

      {/* Month Tabs */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        overflowX: "auto",
        paddingBottom: "0.75rem",
        borderBottom: "1px solid #f1f5f9",
        marginBottom: "1.5rem",
        scrollbarWidth: "none",
      }}>
        {monthNums.map((mNum) => {
          const isActive = selectedMonth === mNum;
          return (
            <button
              key={mNum}
              onClick={() => setSelectedMonth(mNum)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                whiteSpace: "nowrap",
                background: isActive ? `${PRIMARY}18` : "transparent",
                color: isActive ? PRIMARY : "#64748b",
                transition: "all 0.15s ease",
              }}
            >
              {monthNames[mNum - 1].slice(0, 3)}
              {mNum === currentMonthNum && " 📌"}
            </button>
          );
        })}
      </div>

      {/* Showcase Circle */}
      {activeCelebrants.length > 0 ? (
        <div style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <BirthdayCircle
            month={monthNames[selectedMonth - 1]}
            celebrants={activeCelebrants.map((c) => ({
              id: c.id,
              name: `${c.firstName} ${c.lastName}`,
              profilePicture: c.profilePicture
            }))}
          />
        </div>
      ) : (
        <div style={{
          background: "white",
          borderRadius: "16px",
          border: "1px dashed #cbd5e1",
          padding: "3rem 1.5rem",
          textAlign: "center",
          color: "#64748b",
          fontSize: "0.875rem",
          marginBottom: "1.5rem"
        }}>
          No members celebrate birthdays in {monthNames[selectedMonth - 1]}.
        </div>
      )}

      {/* Grid of Celebrants */}
      {activeCelebrants.length > 0 && (
        <div style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "1.25rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "0.85rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🎉 {monthNames[selectedMonth - 1]} Celebrants List:
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
            {activeCelebrants.map((c) => {
              const initials = `${c.firstName[0]}${c.lastName[0]}`.toUpperCase();
              return (
                <button
                  key={c.id}
                  onClick={() => router.push(`/member/${c.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "#f8fafc",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1px solid #f1f5f9",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#4EB1CB";
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(78,177,203,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#f1f5f9";
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: PRIMARY,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1.5px solid ${GOLD}40`,
                    flexShrink: 0
                  }}>
                    {c.profilePicture ? (
                      <img
                        src={c.profilePicture}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ color: "white", fontWeight: 700, fontSize: "0.8rem" }}>{initials}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>
                      {c.firstName} {c.lastName}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: GOLD, fontWeight: 700 }}>
                      🎂 {monthNames[c.birthMonth - 1]} {c.birthDay}
                    </span>
                  </div>
                  <span style={{ fontSize: "1.25rem", color: "#cbd5e1" }}>→</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
