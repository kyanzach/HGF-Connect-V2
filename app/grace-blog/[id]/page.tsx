import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

const PRIMARY = "#4EB1CB";

interface GraceNoteDetailProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: GraceNoteDetailProps): Promise<Metadata> {
  const resolvedParams = await params;
  const noteId = parseInt(resolvedParams.id);
  if (isNaN(noteId)) return { title: "Grace Blog — HGF Connect" };

  const note = await db.journalEntry.findUnique({
    where: { id: noteId },
    include: { author: true },
  });

  if (!note || note.visibility !== "PUBLIC") {
    return { title: "Grace Blog — HGF Connect" };
  }

  const authorName = `${note.author.firstName} ${note.author.lastName}`;
  const titleText = note.title || "Grace Blog Post";
  const snippet = note.content.replace(/<[^>]*>/g, " ").slice(0, 155);

  return {
    title: `${titleText} by ${authorName} — HGF Connect`,
    description: snippet,
    openGraph: {
      title: `${titleText} by ${authorName}`,
      description: snippet,
      type: "article",
      url: `https://connect.houseofgrace.ph/grace-blog/${note.id}`,
    },
  };
}

export default async function GraceNoteDetailPage({ params }: GraceNoteDetailProps) {
  const resolvedParams = await params;
  const noteId = parseInt(resolvedParams.id);
  if (isNaN(noteId)) notFound();

  const note = await db.journalEntry.findUnique({
    where: { id: noteId },
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
  });

  if (!note) notFound();

  const session = await auth();

  // Access check
  if (note.visibility === "PRIVATE") {
    // Only the author can see private notes
    const viewerId = session ? parseInt(session.user.id) : null;
    if (note.authorId !== viewerId) {
      redirect("/login");
    }
  } else if (note.visibility === "MEMBERS_ONLY" && !session) {
    // Must be logged in to view members-only notes
    redirect("/login");
  }

  const authorName = `${note.author.firstName} ${note.author.lastName}`;
  const initials = `${note.author.firstName[0]}${note.author.lastName[0]}`.toUpperCase();
  const profilePic = note.author.profilePicture
    ? `/uploads/profile_pictures/${note.author.profilePicture}`
    : null;

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", background: "#ffffff", minHeight: "100vh", paddingBottom: "3rem" }}>
      {/* Top Header/Bar */}
      <div
        style={{
          background: "#f8fafc",
          padding: "1rem",
          paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link
          href="/grace-blog"
          style={{
            border: "none",
            fontSize: "0.875rem",
            fontWeight: 700,
            color: PRIMARY,
            textDecoration: "none",
            padding: "0.3rem 0.75rem",
            borderRadius: "999px",
            background: "#e0f7fb",
          }}
        >
          ← All Blog Posts
        </Link>
        <div style={{ marginLeft: "auto" }} />
        {note.visibility === "PUBLIC" && (
          <span style={{ fontSize: "0.65rem", background: "#e0fdf4", color: "#047857", padding: "0.2rem 0.6rem", borderRadius: "999px", fontWeight: 700 }}>
            🌐 Public
          </span>
        )}
        {note.visibility === "MEMBERS_ONLY" && (
          <span style={{ fontSize: "0.65rem", background: "#e0f2fe", color: "#0369a1", padding: "0.2rem 0.6rem", borderRadius: "999px", fontWeight: 700 }}>
            👥 Members Only
          </span>
        )}
        {note.visibility === "PRIVATE" && (
          <span style={{ fontSize: "0.65rem", background: "#f1f5f9", color: "#475569", padding: "0.2rem 0.6rem", borderRadius: "999px", fontWeight: 700 }}>
            🔒 Private
          </span>
        )}
      </div>

      <div style={{ padding: "1.25rem" }}>
        {/* Title */}
        <h1 style={{ fontSize: "1.375rem", fontWeight: 800, color: "#0f172a", margin: "0 0 1rem", lineHeight: 1.35 }}>
          {note.title || "Untitled Blog Post"}
        </h1>

        {/* Author Line */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingBottom: "1rem", borderBottom: "1px solid #f1f5f9", marginBottom: "1.5rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: "#e0f7fb", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #cbd5e1" }}>
            {profilePic ? (
              <img src={profilePic} alt={authorName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: "0.875rem", fontWeight: 800, color: PRIMARY, display: "flex", alignSelf: "center", margin: "0 auto" }}>{initials}</span>
            )}
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }}>{authorName}</div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Published {new Date(note.createdAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>

        {/* Suggested Bible Verse */}
        {note.verseRef && (
          <div
            style={{
              background: "linear-gradient(135deg, #1a7a94 0%, #4EB1CB 100%)",
              borderRadius: "14px",
              padding: "1rem",
              color: "white",
              marginBottom: "1.5rem",
              boxShadow: "0 4px 12px rgba(78,177,203,0.15)",
            }}
          >
            <div style={{ fontSize: "0.7rem", fontWeight: 700, opacity: 0.85, textTransform: "uppercase", marginBottom: "0.25rem" }}>
              📜 Bible Verse
            </div>
            {note.verseText ? (
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontStyle: "italic", lineHeight: 1.6 }}>
                &ldquo;{note.verseText}&rdquo;
              </p>
            ) : null}
            <span style={{ fontSize: "0.725rem", background: "rgba(255,255,255,0.2)", padding: "0.2rem 0.5rem", borderRadius: "999px", fontWeight: 600 }}>
              — {note.verseRef}
            </span>
          </div>
        )}

        {/* Content Body (Rich HTML rendered safely) */}
        <article
          className="grace-note-article-body"
          dangerouslySetInnerHTML={{ __html: note.content }}
          style={{
            fontSize: "0.9375rem",
            color: "#334155",
            lineHeight: 1.8,
            overflowWrap: "break-word",
          }}
        />
      </div>

      {/* Global Article Style Fixes */}
      <style>{`
        .grace-note-article-body h1 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 1.25rem 0 0.5rem; }
        .grace-note-article-body h2 { font-size: 1.125rem; font-weight: 700; color: #1e293b; margin: 1.25rem 0 0.5rem; }
        .grace-note-article-body p { margin: 0 0 1rem; }
        .grace-note-article-body ul, .grace-note-article-body ol { padding-left: 1.25rem; margin: 0 0 1rem; }
        .grace-note-article-body iframe { max-width: 100%; border-radius: 12px; }
      `}</style>
    </div>
  );
}
