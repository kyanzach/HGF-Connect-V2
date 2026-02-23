import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PublicNav from "@/components/layout/PublicNav";
import type { Metadata } from "next";

const PRIMARY = "#4EB1CB";

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  });
}

function duration(joinDate: Date | string | null | undefined): string {
  if (!joinDate) return "";
  const start = new Date(joinDate);
  const now = new Date();
  let m = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const rawDays = now.getDate() - start.getDate();
  const days = rawDays < 0 ? (m--, new Date(now.getFullYear(), now.getMonth(), 0).getDate() + rawDays) : rawDays;
  if (m < 0) return "New member";
  if (m === 0) return `${days} Day${days !== 1 ? "s" : ""}`;
  return `${m} Month${m !== 1 ? "s" : ""}${days > 0 ? ` ${days} Day${days !== 1 ? "s" : ""}` : ""}`;
}

// All photos — both profile_*.jpg and cover_*.jpg — live in profile_pictures/
const picPath = (f: string | null) => f ? `/uploads/profile_pictures/${f}` : null;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const m = await db.member.findUnique({ where: { id: parseInt(id) }, select: { firstName: true, lastName: true } });
  if (!m) return { title: "Member Not Found" };
  return { title: `${m.firstName} ${m.lastName} — HGF Connect` };
}

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const session = await auth();

  const member = await db.member.findUnique({
    where: { id },
    include: {
      ministries: {
        where: { status: "active" },
        include: { ministry: { select: { id: true, name: true } } },
        orderBy: { joinedDate: "asc" },
      },
    },
  });

  if (!member || member.status !== "active") notFound();

  const isOwn = session?.user?.id === String(id);
  const isAdmin = session && ["admin", "moderator"].includes(session.user.role ?? "");
  const initials = `${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`;
  const coverSrc = picPath(member.coverPhoto);
  const avatarSrc = picPath(member.profilePicture);
  const dur = duration(member.joinDate);
  const since = fmt(member.joinDate);
  const familyArr = member.familyMembers
    ? member.familyMembers.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <>
      <PublicNav />
      <div style={{ minHeight: "100vh", background: "#f1f5f9", maxWidth: 480, margin: "0 auto" }}>

        {/* ── Cover photo ──────────────────────────────────────────── */}
        <div style={{ position: "relative", height: 240, background: `linear-gradient(160deg, #0f2d3d 0%, ${PRIMARY} 100%)`, overflow: "hidden" }}>
          {coverSrc && (
            <Image
              src={coverSrc}
              alt="Cover"
              fill
              sizes="480px"
              style={{
                objectFit: "cover",
                objectPosition: `${Number(member.coverPhotoPositionX) || 50}% ${Number(member.coverPhotoPositionY) || 50}%`,
              }}
            />
          )}
          {/* Top gradient vignette */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)", pointerEvents: "none" }} />

          {/* ← Back circle — top-left, visible over photo, not behind avatar */}
          <Link
            href="/directory"
            title="Back to Directory"
            style={{
              position: "absolute",
              top: "0.875rem",
              left: "0.875rem",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              textDecoration: "none",
              fontSize: "1rem",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            ←
          </Link>

          {/* ✏️ Edit circle — own profile only */}
          {isOwn && (
            <Link
              href="/profile/edit"
              title="Edit Profile"
              style={{
                position: "absolute",
                top: "0.875rem",
                right: "0.875rem",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: PRIMARY,
                border: "1px solid rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                textDecoration: "none",
                fontSize: "1rem",
                lineHeight: 1,
              }}
            >
              ✏️
            </Link>
          )}
        </div>


        {/* ── Avatar + name hero card ──────────────────────────────── */}
        <div style={{ background: "white", margin: "0 0 0.75rem", padding: "0 1rem 1.25rem" }}>
          {/* Avatar — overlaps cover */}
          <div style={{ position: "relative", marginTop: -44 }}>
            <div style={{ width: 88, height: 88, borderRadius: "50%", border: "4px solid white", boxShadow: "0 4px 20px rgba(0,0,0,0.18)", overflow: "hidden", background: `${PRIMARY}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {avatarSrc ? (
                <Image src={avatarSrc} alt={`${member.firstName} ${member.lastName}`} width={88} height={88} style={{ objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "2rem", fontWeight: 900, color: PRIMARY }}>{initials}</span>
              )}
            </div>
          </div>

          {/* Name */}
          <h1 style={{ fontSize: "1.375rem", fontWeight: 900, color: "#0f172a", margin: "0.75rem 0 0.375rem", letterSpacing: "-0.02em" }}>
            {member.firstName} {member.lastName}
          </h1>

          {/* Member since chip */}
          {since && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: `${PRIMARY}12`, color: PRIMARY, fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: "999px", border: `1px solid ${PRIMARY}30` }}>
              📅 Member since {since}
            </span>
          )}

          {/* Verse */}
          {member.favoriteVerse && (
            <div style={{ marginTop: "1rem", padding: "0.875rem", background: "#f8fafc", borderRadius: "12px", borderLeft: `3px solid ${PRIMARY}` }}>
              <p style={{ fontSize: "0.875rem", fontStyle: "italic", color: "#475569", lineHeight: 1.65, margin: 0 }}>
                &ldquo;{member.favoriteVerse}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* ── Ministry Involvement ─────────────────────────────────── */}
        {member.ministries.length > 0 && (
          <div style={{ background: "white", margin: "0 0 0.75rem", padding: "1rem" }}>
            <h2 style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.75rem" }}>
              🤲 Ministry Involvement
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {member.ministries.map((mm) => (
                <span key={mm.id} style={{ background: PRIMARY, color: "white", padding: "0.35rem 0.875rem", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 700 }}>
                  {mm.ministry.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Personal Details ─────────────────────────────────────── */}
        <div style={{ background: "white", margin: "0 0 0.75rem", padding: "1rem" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.875rem" }}>
            ℹ️ Personal Details
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {member.birthdate && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                <span style={{ fontSize: "1.125rem", width: 24, textAlign: "center" }}>🎂</span>
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>Birthday</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>{fmt(member.birthdate)}</div>
                </div>
              </div>
            )}
            {member.baptismDate && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                <span style={{ fontSize: "1.125rem", width: 24, textAlign: "center" }}>🌊</span>
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>Baptism Date</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>{fmt(member.baptismDate)}</div>
                </div>
              </div>
            )}
            {member.invitedBy && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                <span style={{ fontSize: "1.125rem", width: 24, textAlign: "center" }}>👥</span>
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>Invited By</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>{member.invitedBy}</div>
                </div>
              </div>
            )}
            {!member.birthdate && !member.baptismDate && !member.invitedBy && (
              <p style={{ color: "#94a3b8", fontSize: "0.875rem", margin: 0 }}>No personal details shared.</p>
            )}
          </div>
        </div>

        {/* ── Contact Info ─────────────────────────────────────────── */}
        {(member.email || member.phone || member.address) && (
          <div style={{ background: "white", margin: "0 0 0.75rem", padding: "1rem" }}>
            <h2 style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.875rem" }}>
              📋 Contact Information
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {member.email && (member.showEmail || isAdmin || isOwn) && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <span style={{ fontSize: "1.125rem", width: 24, textAlign: "center" }}>✉️</span>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>Email</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{member.email}</div>
                  </div>
                </div>
              )}
              {member.phone && (member.showPhone || isAdmin || isOwn) && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <span style={{ fontSize: "1.125rem", width: 24, textAlign: "center" }}>📞</span>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>Phone</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{member.phone}</div>
                  </div>
                </div>
              )}
              {member.address && (member.showAddress || isAdmin || isOwn) && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <span style={{ fontSize: "1.125rem", width: 24, textAlign: "center" }}>📍</span>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>Address</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{member.address}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Family Members ───────────────────────────────────────── */}
        {familyArr.length > 0 && (
          <div style={{ background: "white", margin: "0 0 0.75rem", padding: "1rem" }}>
            <h2 style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.75rem" }}>
              🏠 Family Members
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {familyArr.map((name, i) => (
                <span key={i} style={{ background: "#f1f5f9", color: "#475569", padding: "0.35rem 0.75rem", borderRadius: "999px", fontSize: "0.825rem", fontWeight: 600 }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Member Status ────────────────────────────────────────── */}
        {dur && (
          <div style={{ background: "white", margin: "0 0 0.75rem", padding: "1rem" }}>
            <h2 style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.875rem" }}>
              📈 Member Status
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ background: `${PRIMARY}12`, borderRadius: "14px", padding: "0.875rem 1.25rem", flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: "1.625rem", fontWeight: 900, color: PRIMARY, letterSpacing: "-0.02em" }}>{dur}</div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", marginTop: "0.2rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Member Duration</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>Joined</div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }}>{since}</div>
              </div>
            </div>
          </div>
        )}

        {/* bottom padding for dock */}
        <div style={{ height: "2rem" }} />
      </div>
    </>
  );
}
