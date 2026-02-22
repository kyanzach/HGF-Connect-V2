import { db } from "@/lib/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: { username: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const member = await db.member.findFirst({
    where: { username: params.username },
    select: { firstName: true, lastName: true },
  });
  if (!member) return { title: "Journal Not Found" };
  return {
    title: `${member.firstName}'s Journal | HGF Connect`,
    description: `Spiritual journal entries by ${member.firstName} ${member.lastName}`,
    openGraph: {
      title: `${member.firstName}'s Journal | HGF Connect`,
      description: `Spiritual reflections by ${member.firstName} ${member.lastName}`,
      type: "website",
    },
  };
}

const MOOD_EMOJI: Record<string, string> = {
  grateful: "🙏", peaceful: "☮️", hopeful: "✨", joyful: "😊",
  reflective: "🤔", struggling: "💪", anxious: "😰",
};

export default async function PublicJournalPage({ params }: Props) {
  const member = await db.member.findFirst({
    where: { username: params.username },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
      favoriteVerse: true,
    },
  });

  if (!member) notFound();

  const entries = await db.journalEntry.findMany({
    where: {
      authorId: member.id,
      visibility: "PUBLIC",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      content: true,
      mood: true,
      verseRef: true,
      createdAt: true,
    },
  });

  const initials = `${member.firstName[0]}${member.lastName?.[0] ?? ""}`;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0 0 3rem", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Back nav */}
      <div style={{ padding: "0.75rem 1rem", background: "#4EB1CB" }}>
        <Link href="/" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>
          ← Back to HGF Connect
        </Link>
      </div>

      {/* Author header */}
      <div
        style={{
          background: "linear-gradient(135deg, #4338ca 0%, #7c3aed 100%)",
          padding: "2rem 1.25rem",
          textAlign: "center",
          color: "white",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.75rem",
            fontWeight: 800,
            margin: "0 auto 0.875rem",
            border: "3px solid rgba(255,255,255,0.4)",
          }}
        >
          {initials}
        </div>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 800, margin: "0 0 0.25rem" }}>
          {member.firstName}&apos;s Journal
        </h1>
        <p style={{ fontSize: "0.8rem", opacity: 0.8, margin: "0 0 0.5rem" }}>
          {entries.length} public entr{entries.length !== 1 ? "ies" : "y"}
        </p>
        {member.favoriteVerse && (
          <p style={{ fontSize: "0.75rem", fontStyle: "italic", opacity: 0.75, maxWidth: 320, margin: "0 auto" }}>
            &ldquo;{member.favoriteVerse.slice(0, 100)}{member.favoriteVerse.length > 100 ? "…" : ""}&rdquo;
          </p>
        )}
      </div>

      {/* Entries */}
      <div style={{ padding: "1rem" }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📔</div>
            <p>No public journal entries yet.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "1.125rem",
                marginBottom: "0.875rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              {/* Entry meta */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  {new Date(entry.createdAt).toLocaleDateString("en-PH", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {entry.mood && (
                  <span style={{ fontSize: "1rem" }}>
                    {MOOD_EMOJI[entry.mood] ?? "📔"} <span style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "capitalize" }}>{entry.mood}</span>
                  </span>
                )}
              </div>

              {entry.title && (
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.5rem" }}>
                  {entry.title}
                </h2>
              )}

              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#334155",
                  lineHeight: 1.7,
                  margin: "0",
                  display: "-webkit-box",
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {entry.content}
              </p>

              {entry.verseRef && (
                <div
                  style={{
                    marginTop: "0.875rem",
                    padding: "0.5rem 0.75rem",
                    background: "#f5f3ff",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    color: "#7c3aed",
                    fontStyle: "italic",
                    fontWeight: 500,
                  }}
                >
                  📖 {entry.verseRef}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
