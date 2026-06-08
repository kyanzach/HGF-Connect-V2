"use client";

import { useState } from "react";
import BirthdayCircle from "@/components/feed/BirthdayCircle";

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  birthdate: string;
  birthMonth: number;
  birthDay: number;
}

const PRIMARY = "#4EB1CB";
const GOLD = "#f59e0b";

const BIRTHDAY_VERSES = [
  { ref: "Psalm 139:13-14", text: "For you created my inmost being; you knit me together in my mother's womb. I praise you because I am fearfully and wonderfully made." },
  { ref: "Numbers 6:24-26", text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace." },
  { ref: "Ephesians 2:10", text: "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do." },
  { ref: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future." },
  { ref: "Psalm 20:4", text: "May he give you the desire of your heart and make all your plans succeed." },
  { ref: "Psalm 37:4", text: "Take delight in the Lord, and he will give you the desires of your heart." },
  { ref: "3 John 1:2", text: "Dear friend, I pray that you may enjoy good health and that all may go well with you, even as your soul is getting along well." },
  { ref: "Proverbs 9:11", text: "For through wisdom your days will be many, and years will be added to your life." }
];

export default function BirthdayAdminClient({ initialMembers }: { initialMembers: any[] }) {
  // Current month in Manila Time
  const now = new Date();
  const manilaStr = now.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaDate = new Date(manilaStr);
  const currentMonthNum = manilaDate.getMonth() + 1; // 1-12

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Parse dates into UTC month/day values
  const parsedMembers: Member[] = initialMembers.map((m) => {
    const birth = new Date(m.birthdate);
    const month = birth.getUTCMonth() + 1;
    const day = birth.getUTCDate();
    return {
      ...m,
      birthMonth: month,
      birthDay: day,
    };
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [expandedPreview, setExpandedPreview] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null); // "monthly" or memberId string
  const [notif, setNotif] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Month sorting starting from the current month
  const orderedMonthNums: number[] = [];
  for (let i = 0; i < 12; i++) {
    orderedMonthNums.push(((currentMonthNum - 1 + i) % 12) + 1);
  }

  // Monthly Celebrants
  const thisMonthCelebrants = parsedMembers.filter((m) => m.birthMonth === currentMonthNum);
  const activeCelebrants = parsedMembers.filter((m) => m.birthMonth === selectedMonth)
    .sort((a, b) => a.birthDay - b.birthDay);

  async function handlePostDemo(type: "monthly" | "daily", memberId?: number) {
    const key = type === "monthly" ? "monthly" : String(memberId);
    setLoading(key);
    setNotif(null);
    try {
      const res = await fetch("/api/admin/birthdays/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, memberId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post demo announcement");
      }
      setNotif({
        type: "success",
        text: `🎉 Post created successfully! (Post ID: ${data.postId}). It is now live on the community feed.`
      });
    } catch (err: any) {
      setNotif({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ padding: "2rem 2.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
            🎂 Birthday Control Board
          </h1>
          <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
            Preview upcoming schedules and manually trigger birthday feed announcements.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {notif && (
        <div style={{
          padding: "1rem 1.25rem",
          borderRadius: "12px",
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
          fontWeight: 600,
          background: notif.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${notif.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: notif.type === "success" ? "#166534" : "#991b1b",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          animation: "fadeIn 0.2s ease-out",
        }}>
          {notif.text}
        </div>
      )}

      {/* Main Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
        gap: "2rem",
        alignItems: "start",
      }}>
        {/* LEFT COLUMN: Monthly Preview */}
        <div style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
            Monthly Announcement Preview
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.82rem", lineHeight: 1.4, marginBottom: "1.25rem" }}>
            This post triggers on the <strong>1st day of the month</strong> showing all members celebrating this month. Below is how it looks:
          </p>

          {thisMonthCelebrants.length > 0 ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{
                background: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #f1f5f9",
                padding: "0.75rem"
              }}>
                <BirthdayCircle
                  month={monthNames[currentMonthNum - 1]}
                  celebrants={thisMonthCelebrants.map((c) => ({
                    id: c.id,
                    name: `${c.firstName} ${c.lastName}`,
                    profilePicture: c.profilePicture
                  }))}
                />
              </div>
            </div>
          ) : (
            <div style={{
              background: "#f8fafc",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              color: "#64748b",
              fontSize: "0.875rem",
              border: "1px dashed #cbd5e1",
              marginBottom: "1.5rem",
            }}>
              No members are born in {monthNames[currentMonthNum - 1]}.
            </div>
          )}

          <button
            onClick={() => handlePostDemo("monthly")}
            disabled={loading === "monthly" || thisMonthCelebrants.length === 0}
            style={{
              width: "100%",
              background: `linear-gradient(135deg, ${PRIMARY} 0%, #38a89d 100%)`,
              color: "white",
              fontWeight: 700,
              fontSize: "0.9rem",
              border: "none",
              borderRadius: "10px",
              padding: "12px",
              cursor: (loading === "monthly" || thisMonthCelebrants.length === 0) ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(78, 177, 203, 0.2)",
              opacity: (loading === "monthly" || thisMonthCelebrants.length === 0) ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {loading === "monthly" ? "⏳ Publishing Announcement..." : "📣 Post Monthly Celebrants Now"}
          </button>
        </div>

        {/* RIGHT COLUMN: Upcoming Birthdays List */}
        <div style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
            Upcoming Birthdays (Daily Posts)
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.82rem", lineHeight: 1.4, marginBottom: "1.25rem" }}>
            Select a month below to preview and publish daily birthday cards for that month's celebrants:
          </p>

          {/* Month Tab strip */}
          <div style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            paddingBottom: "0.75rem",
            borderBottom: "1px solid #f1f5f9",
            marginBottom: "1.25rem",
            scrollbarWidth: "thin",
          }}>
            {orderedMonthNums.map((mNum) => {
              const isActive = selectedMonth === mNum;
              return (
                <button
                  key={mNum}
                  onClick={() => {
                    setSelectedMonth(mNum);
                    setExpandedPreview(null);
                  }}
                  style={{
                    padding: "6px 12px",
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

          {/* Celebrants list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {activeCelebrants.length === 0 ? (
              <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.875rem", padding: "2rem 0" }}>
                No celebrants in {monthNames[selectedMonth - 1]}
              </p>
            ) : (
              activeCelebrants.map((c) => {
                const initials = `${c.firstName[0]}${c.lastName[0]}`.toUpperCase();
                const verse = BIRTHDAY_VERSES[c.id % BIRTHDAY_VERSES.length];
                const isExpanded = expandedPreview === c.id;

                return (
                  <div
                    key={c.id}
                    style={{
                      border: "1px solid #f1f5f9",
                      borderRadius: "12px",
                      padding: "1rem",
                      background: "#fcfcfc",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      {/* Avatar */}
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: PRIMARY,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `2px solid ${GOLD}40`,
                        flexShrink: 0,
                      }}>
                        {c.profilePicture ? (
                          <img
                            src={`/uploads/profile_pictures/${c.profilePicture}`}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ color: "white", fontWeight: 700, fontSize: "0.9rem" }}>{initials}</span>
                        )}
                      </div>

                      {/* Name & Date */}
                      <div style={{ flex: 1, minWidth: 150 }}>
                        <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 800, color: "#1e293b" }}>
                          {c.firstName} {c.lastName}
                        </h4>
                        <span style={{ fontSize: "0.75rem", color: GOLD, fontWeight: 700 }}>
                          🎂 {monthNames[c.birthMonth - 1]} {c.birthDay}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => setExpandedPreview(isExpanded ? null : c.id)}
                          style={{
                            background: "transparent",
                            border: "1px solid #cbd5e1",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "#475569",
                            cursor: "pointer",
                          }}
                        >
                          {isExpanded ? "Hide Preview" : "Preview Greeting"}
                        </button>
                        <button
                          onClick={() => handlePostDemo("daily", c.id)}
                          disabled={loading === String(c.id)}
                          style={{
                            background: GOLD,
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: loading === String(c.id) ? "not-allowed" : "pointer",
                            boxShadow: `0 2px 6px ${GOLD}30`,
                            opacity: loading === String(c.id) ? 0.7 : 1,
                          }}
                        >
                          {loading === String(c.id) ? "⏳ Posting..." : "🚀 Post Demo"}
                        </button>
                      </div>
                    </div>

                    {/* Expandable preview details */}
                    {isExpanded && (
                      <div style={{
                        marginTop: "1rem",
                        paddingTop: "1rem",
                        borderTop: "1px dashed #e2e8f0",
                        fontSize: "0.8rem",
                        lineHeight: 1.4,
                        color: "#334155"
                      }}>
                        <div style={{
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: "8px",
                          padding: "10px",
                          marginBottom: "0.75rem",
                        }}>
                          <strong style={{ color: "#78350f", display: "block", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "4px" }}>
                            Greeting Text:
                          </strong>
                          🎉 Happy Birthday to our beloved brother/sister in Christ, {c.firstName} {c.lastName}! 🎂🎈
                          <br /><br />
                          On this special day, we praise God for the gift of your life and the unique blessing you are to our church community. May the Lord guide your steps, keep you in His perfect peace, and shower you with His abundant grace...
                          <br /><br />
                          We celebrate you today on behalf of your family here at House of Grace Fellowship! ❤️
                        </div>

                        <div style={{
                          background: "white",
                          borderLeft: `3px solid ${GOLD}`,
                          borderRadius: "0 8px 8px 0",
                          padding: "8px 10px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}>
                          <strong style={{ color: "#b45309", display: "block", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "2px" }}>
                            Scripture Verse:
                          </strong>
                          "{verse.text}"
                          <span style={{ display: "block", fontWeight: 700, marginTop: "2px", color: GOLD }}>
                            — {verse.ref}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
