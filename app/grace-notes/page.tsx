import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grace Notes — House of Grace Fellowship",
  description: "Browse members' walk of faith stories, diaries, and spiritual reflections from the House of Grace community.",
};

const PRIMARY = "#4EB1CB";
const LIMIT = 10;

interface GraceNotesPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function GraceNotesPage({ searchParams }: GraceNotesPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const skip = (page - 1) * LIMIT;

  const session = await auth();

  // Show PUBLIC notes to everyone; also show MEMBERS_ONLY notes if logged in
  const visibilityFilter = {
    OR: [
      { visibility: "PUBLIC" as const },
      ...(session ? [{ visibility: "MEMBERS_ONLY" as const }] : []),
    ],
  };

  const [notes, total] = await Promise.all([
    db.journalEntry.findMany({
      where: visibilityFilter,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
      },
      skip,
      take: LIMIT,
    }),
    db.journalEntry.count({
      where: visibilityFilter,
    }),
  ]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", background: "#f8fafc", minHeight: "100vh", paddingBottom: "2rem" }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, #1a7a94 0%, ${PRIMARY} 100%)`,
          padding: "1.75rem 1.25rem 2rem",
          paddingTop: "calc(1.75rem + env(safe-area-inset-top, 0px))",
          color: "white",
          textAlign: "center",
          position: "relative",
        }}
      >
        <Link
          href="/"
          style={{
            position: "absolute",
            left: "1rem",
            top: "calc(1.75rem + env(safe-area-inset-top, 0px))",
            color: "white",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 700,
            background: "rgba(255, 255, 255, 0.2)",
            padding: "0.3rem 0.75rem",
            borderRadius: "999px",
          }}
        >
          ← Home
        </Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.25rem" }}>
          📝 Grace Notes
        </h1>
        <p style={{ fontSize: "0.8rem", opacity: 0.9, margin: 0 }}>
          Spiritual diaries and walk of faith stories from our members
        </p>
      </div>

      <div style={{ padding: "1rem" }}>
        {notes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", background: "white", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: "3rem" }}>📝</span>
            <p style={{ margin: "1rem 0 0", color: "#64748b", fontWeight: 600 }}>No public Grace Notes found.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {notes.map((note) => {
              const authorName = `${note.author.firstName} ${note.author.lastName}`;
              const initials = `${note.author.firstName[0]}${note.author.lastName[0]}`.toUpperCase();
              const profilePic = note.author.profilePicture
                ? `/uploads/profile_pictures/${note.author.profilePicture}`
                : null;
              
              // Strip HTML tags for clean snippet
              const textSnippet = note.content.replace(/<[^>]*>/g, " ");

              return (
                <Link
                  key={note.id}
                  href={`/grace-notes/${note.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: "white",
                      borderRadius: "16px",
                      padding: "1.25rem",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      transition: "transform 0.15s",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {/* Author line */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #cbd5e1" }}>
                        {profilePic ? (
                          <img src={profilePic} alt={authorName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: PRIMARY }}>{initials}</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>{authorName}</div>
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>
                          {new Date(note.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      
                      {/* Visibility badge */}
                      {note.visibility === "MEMBERS_ONLY" && (
                        <span style={{ background: "#e0f2fe", color: "#0369a1", fontSize: "0.6rem", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: "999px" }}>
                          👥 Members
                        </span>
                      )}
                    </div>

                    {note.title && (
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
                        {note.title}
                      </h3>
                    )}

                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "#475569",
                        lineHeight: 1.55,
                        margin: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical" as any,
                        overflow: "hidden",
                      }}
                    >
                      {textSnippet}
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", fontWeight: 700, color: PRIMARY, borderTop: "1px solid #f1f5f9", paddingTop: "0.625rem" }}>
                      <span>Read Full Entry →</span>
                      {note.verseRef && <span style={{ color: "#94a3b8", fontWeight: 500 }}>📜 {note.verseRef}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1.5rem" }}>
            <Link
              href={`/grace-notes?page=${page - 1}`}
              style={{
                background: "white",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                color: page > 1 ? PRIMARY : "#94a3b8",
                fontSize: "0.8rem",
                fontWeight: 700,
                textDecoration: "none",
                pointerEvents: page > 1 ? undefined : "none",
                opacity: page > 1 ? 1 : 0.5,
              }}
            >
              ← Prev
            </Link>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
              Page {page} of {totalPages}
            </span>
            <Link
              href={`/grace-notes?page=${page + 1}`}
              style={{
                background: "white",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                color: page < totalPages ? PRIMARY : "#94a3b8",
                fontSize: "0.8rem",
                fontWeight: 700,
                textDecoration: "none",
                pointerEvents: page < totalPages ? undefined : "none",
                opacity: page < totalPages ? 1 : 0.5,
              }}
            >
              Next →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
