import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PublicNav from "@/components/layout/PublicNav";
import type { Metadata } from "next";

const PRIMARY = "#4EB1CB";

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "Not specified";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  });
}

function memberDuration(joinDate: Date | string | null | undefined): string {
  if (!joinDate) return "";
  const start = new Date(joinDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const days = now.getDate() - start.getDate();
  const adjustedDays = days < 0 ? (months--, new Date(now.getFullYear(), now.getMonth(), 0).getDate() + days) : days;
  if (months < 0) return "New member";
  if (months === 0) return `${adjustedDays} Day${adjustedDays !== 1 ? "s" : ""}`;
  return `${months} Month${months !== 1 ? "s" : ""}${adjustedDays > 0 ? ` ${adjustedDays} Day${adjustedDays !== 1 ? "s" : ""}` : ""}`;
}

// ── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const member = await db.member.findUnique({ where: { id: parseInt(id) }, select: { firstName: true, lastName: true } });
  if (!member) return { title: "Member Not Found" };
  return { title: `${member.firstName} ${member.lastName} — HGF Connect` };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function MemberProfilePage(
  { params }: { params: Promise<{ id: string }> }
) {
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
  const coverSrc = member.coverPhoto ? `/uploads/cover_photos/${member.coverPhoto}` : null;
  const avatarSrc = member.profilePicture ? `/uploads/profile_pictures/${member.profilePicture}` : null;
  const duration = memberDuration(member.joinDate);
  const since = formatDate(member.joinDate);
  const familyArr = member.familyMembers ? member.familyMembers.split(",").map((s) => s.trim()).filter(Boolean) : [];

  // ── Layout helpers ────────────────────────────────────────────────────────
  const card = (children: React.ReactNode) => (
    <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1px solid #e8edf3" }}>
      {children}
    </div>
  );

  const sectionTitle = (icon: string, label: string) => (
    <h3 style={{ fontSize: "1rem", fontWeight: 800, color: PRIMARY, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {icon} {label}
    </h3>
  );

  const detailRow = (icon: string, label: string, value: string | null | undefined, addNow?: boolean) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.875rem" }}>
      <span style={{ fontSize: "1.1rem", width: 22, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
        <div style={{ fontSize: "0.925rem", fontWeight: 600, color: value ? "#1e293b" : "#94a3b8" }}>
          {value || "Not specified"}
          {!value && addNow && isOwn && (
            <Link href="/profile/edit" style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: PRIMARY, textDecoration: "none", fontWeight: 700 }}>
              Add Now +
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PublicNav />
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>

        {/* ── Cover Photo ── */}
        <div style={{ position: "relative", height: "clamp(200px, 30vw, 320px)", background: "linear-gradient(135deg, #1a4a5e 0%, #4EB1CB 100%)", overflow: "hidden" }}>
          {coverSrc && (
            <Image src={coverSrc} alt="Cover" fill style={{ objectFit: "cover", objectPosition: `${member.coverPhotoPositionX ?? 50}% ${member.coverPhotoPositionY ?? 50}%` }} />
          )}
          {/* Back & Edit buttons */}
          <div style={{ position: "absolute", top: "1rem", left: "1rem", right: "1rem", display: "flex", justifyContent: "space-between" }}>
            <Link href="/directory" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", color: "white", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "10px", fontSize: "0.825rem", fontWeight: 700 }}>
              ← Back to Directory
            </Link>
            {isOwn && (
              <Link href="/profile/edit" style={{ background: PRIMARY, color: "white", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "10px", fontSize: "0.825rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.375rem" }}>
                ✏️ Edit Profile
              </Link>
            )}
          </div>
        </div>

        {/* ── Avatar + Name ── */}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 1.5rem" }}>
          <div style={{ position: "relative", marginTop: -48, display: "flex", alignItems: "flex-end", gap: "1rem", marginBottom: "1rem" }}>
            {/* Avatar */}
            <div style={{ width: 96, height: 96, borderRadius: "50%", border: "4px solid white", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", background: `${PRIMARY}30`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {avatarSrc ? (
                <Image src={avatarSrc} alt={`${member.firstName} ${member.lastName}`} width={96} height={96} style={{ objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "2rem", fontWeight: 800, color: PRIMARY }}>{initials}</span>
              )}
            </div>
            {/* Name block */}
            <div style={{ paddingBottom: "0.25rem" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.375rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {member.firstName} {member.lastName}
                {isOwn && (
                  <Link href="/profile/edit" style={{ fontSize: "0.875rem", color: "#94a3b8", textDecoration: "none" }}>✏️</Link>
                )}
              </h1>
              {member.joinDate && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "white", border: `1.5px solid ${PRIMARY}`, color: PRIMARY, fontSize: "0.775rem", fontWeight: 700, padding: "0.2rem 0.75rem", borderRadius: "999px" }}>
                  📅 Member since {since}
                </span>
              )}
            </div>
          </div>

          {/* Favorite Verse */}
          {member.favoriteVerse && (
            <div style={{ background: "white", borderRadius: "14px", padding: "1.25rem 1.5rem", marginBottom: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", border: "1px solid #e8edf3" }}>
              <span style={{ fontSize: "1.5rem", color: PRIMARY, marginRight: "0.5rem", verticalAlign: "middle" }}>&ldquo;&ldquo;</span>
              <span style={{ fontSize: "0.925rem", fontStyle: "italic", color: "#374151", lineHeight: 1.7 }}>
                {member.favoriteVerse}
              </span>
              <span style={{ fontSize: "1.5rem", color: PRIMARY, marginLeft: "0.5rem", verticalAlign: "middle" }}>&rdquo;&rdquo;</span>
            </div>
          )}

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(240px, 340px)", gap: "1.25rem", marginBottom: "1.25rem" }}>
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {/* Personal Details */}
              {card(<>
                {sectionTitle("ℹ️", "Personal Details")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                  {detailRow("🎂", "Birthday", member.birthdate ? formatDate(member.birthdate) : null, true)}
                  {detailRow("🌊", "Baptism Date", member.baptismDate ? formatDate(member.baptismDate) : null, true)}
                  {detailRow("👥", "Invited By", member.invitedBy)}
                </div>
              </>)}

              {/* Ministry Involvement */}
              {member.ministries.length > 0 && card(<>
                {sectionTitle("🤲", "Ministry Involvement")}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {member.ministries.map((mm) => (
                    <span key={mm.id} style={{ background: PRIMARY, color: "white", padding: "0.35rem 0.875rem", borderRadius: "8px", fontSize: "0.825rem", fontWeight: 700 }}>
                      {mm.ministry.name}
                    </span>
                  ))}
                </div>
              </>)}

              {/* Family Members */}
              {familyArr.length > 0 && card(<>
                {sectionTitle("🏠", "Family Members")}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {familyArr.map((name, i) => (
                    <span key={i} style={{ background: "#f1f5f9", color: "#475569", padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.825rem", fontWeight: 600 }}>
                      {name}
                    </span>
                  ))}
                </div>
              </>)}
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {/* Contact Information */}
              {card(<>
                {sectionTitle("📋", "Contact Information")}
                {(member.showEmail || isAdmin || isOwn) && member.email &&
                  detailRow("✉️", "Email", member.showEmail || isAdmin || isOwn ? member.email : "— (hidden)")}
                {(member.showPhone || isAdmin || isOwn) && member.phone &&
                  detailRow("📞", "Phone", member.showPhone || isAdmin || isOwn ? member.phone : "— (hidden)")}
                {(member.showAddress || isAdmin || isOwn) && member.address &&
                  detailRow("📍", "Address", member.showAddress || isAdmin || isOwn ? member.address : "— (hidden)")}
                {!member.email && !member.phone && !member.address && (
                  <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>No contact info shared.</p>
                )}
              </>)}

              {/* Member Status */}
              {card(<>
                {sectionTitle("📈", "Member Status")}
                {duration && (
                  <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "1.875rem", fontWeight: 900, color: PRIMARY, lineHeight: 1.1 }}>{duration}</div>
                    <div style={{ fontSize: "0.775rem", color: "#94a3b8", fontWeight: 600, marginTop: "0.25rem" }}>Member Duration</div>
                  </div>
                )}
                {member.joinDate && (
                  <p style={{ fontSize: "0.825rem", color: "#64748b", textAlign: "center", margin: 0 }}>
                    Joined on {since}
                  </p>
                )}
              </>)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
