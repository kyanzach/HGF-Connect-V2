import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Prospect Audit | Admin | HGF Connect" };

export default async function AdminProspectAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; listing?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Admin-only
  if (!["admin", "superadmin"].includes((session.user as any).role ?? "")) {
    redirect("/feed");
  }

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const selectedListingId = sp.listing ? parseInt(sp.listing) : undefined;
  const q = sp.q?.trim() || "";
  const PAGE_SIZE = 30;

  const where: any = {};
  if (selectedListingId) where.listingId = selectedListingId;
  if (q) {
    where.OR = [
      { prospectName: { contains: q } },
      { prospectMobile: { contains: q } },
      { shareToken: { contains: q } },
    ];
  }

  const [prospects, total, listings] = await Promise.all([
    db.marketplaceProspect.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        listing: { select: { id: true, title: true, memberId: true } },
      },
    }),
    db.marketplaceProspect.count({ where }),
    db.marketplaceListing.findMany({
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const PRIMARY = "#4EB1CB";

  const STATUS_COLORS: Record<string, string> = {
    pending: "#94a3b8", revealed: "#0ea5e9", contacted: "#8b5cf6",
    converted: "#10b981", rejected: "#ef4444",
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <Link href="/feed" style={{ color: PRIMARY, textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>
        ← Back
      </Link>
      <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1e293b", margin: "0.75rem 0 1rem" }}>
        🔍 Prospect Audit Log
      </h1>

      {/* Filters */}
      <form method="GET" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name / mobile / coupon…"
          style={{ flex: 1, minWidth: 160, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "0.5rem 0.75rem", fontSize: "0.85rem", fontFamily: "inherit" }}
        />
        <select
          name="listing"
          defaultValue={selectedListingId ?? ""}
          style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "0.5rem", fontSize: "0.85rem", fontFamily: "inherit", minWidth: 140, maxWidth: 200 }}
        >
          <option value="">All listings</option>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>{l.title.slice(0, 35)}</option>
          ))}
        </select>
        <button type="submit" style={{ background: PRIMARY, color: "white", border: "none", borderRadius: 8, padding: "0.5rem 1rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem" }}>
          Filter
        </button>
        {(q || selectedListingId) && (
          <Link href="/admin/marketplace/prospects" style={{ display: "flex", alignItems: "center", padding: "0.5rem 0.75rem", background: "#f1f5f9", borderRadius: 8, fontSize: "0.8rem", color: "#64748b", textDecoration: "none", fontWeight: 600 }}>
            Clear
          </Link>
        )}
      </form>

      {/* Summary */}
      <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "1rem" }}>
        {total.toLocaleString()} submissions{q ? ` matching "${q}"` : ""}{selectedListingId ? ` for listing #${selectedListingId}` : ""}
      </p>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        {prospects.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>No results</div>
        ) : (
          prospects.map((p, i) => (
            <div
              key={p.id}
              style={{ padding: "0.75rem 1rem", borderBottom: i < prospects.length - 1 ? "1px solid #f1f5f9" : "none", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-start" }}
            >
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" }}>{p.prospectName}</div>
                {p.prospectMobile && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>📞 {p.prospectMobile}</div>}
                {p.prospectEmail && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>✉️ {p.prospectEmail}</div>}
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <Link href={`/marketplace/${p.listing.id}`} style={{ fontSize: "0.75rem", color: PRIMARY, textDecoration: "none", fontWeight: 600 }}>
                  #{p.listing.id} {p.listing.title.slice(0, 28)}
                </Link>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>
                  {p.actionType === "contact" ? "💬 Contact" : "🎟️ Reveal"}
                  {p.shareToken && <span> · 🔗 {p.shareToken}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 80 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: STATUS_COLORS[p.status] ?? "#94a3b8", background: STATUS_COLORS[p.status] + "18", borderRadius: 6, padding: "0.15rem 0.5rem" }}>
                  {p.status}
                </span>
                <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 2 }}>
                  {new Date(p.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1.25rem", flexWrap: "wrap" }}>
          {page > 1 && (
            <Link href={`?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${selectedListingId ? `&listing=${selectedListingId}` : ""}`}
              style={{ padding: "0.4rem 0.875rem", border: "1.5px solid #e2e8f0", borderRadius: 8, textDecoration: "none", color: "#64748b", fontSize: "0.85rem", fontWeight: 600 }}>
              ← Prev
            </Link>
          )}
          <span style={{ padding: "0.4rem 0.875rem", fontSize: "0.85rem", color: "#94a3b8" }}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${selectedListingId ? `&listing=${selectedListingId}` : ""}`}
              style={{ padding: "0.4rem 0.875rem", border: "1.5px solid #e2e8f0", borderRadius: 8, textDecoration: "none", color: "#64748b", fontSize: "0.85rem", fontWeight: 600 }}>
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
