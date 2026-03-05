import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/admin/love-gifts
 * Admin view of all Love Gift claims with full details.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin role
  const member = await db.member.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { role: true },
  });
  if (!member || !["admin", "moderator"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const claims = await db.loveGiftClaim.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, amount: true, method: true, status: true,
      gcashName: true, gcashMobile: true,
      createdAt: true, paidAt: true, receivedAt: true,
      listing: { select: { id: true, title: true } },
      sharer: { select: { id: true, firstName: true, lastName: true } },
      seller: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Summary stats
  const totalClaims = claims.length;
  const pendingCount = claims.filter((c) => c.status === "pending").length;
  const paidCount = claims.filter((c) => c.status === "paid").length;
  const receivedCount = claims.filter((c) => c.status === "received").length;
  const disputedCount = claims.filter((c) => c.status === "disputed").length;
  const totalAmount = claims.reduce((s, c) => s + Number(c.amount), 0);

  return NextResponse.json({
    summary: { totalClaims, pendingCount, paidCount, receivedCount, disputedCount, totalAmount },
    claims: claims.map((c) => ({
      id: c.id,
      amount: Number(c.amount),
      method: c.method,
      status: c.status,
      gcashName: c.gcashName,
      gcashMobile: c.gcashMobile,
      listing: { id: c.listing.id, title: c.listing.title },
      sharer: { id: c.sharer.id, name: `${c.sharer.firstName} ${c.sharer.lastName}` },
      seller: { id: c.seller.id, name: `${c.seller.firstName} ${c.seller.lastName}` },
      createdAt: c.createdAt.toISOString(),
      paidAt: c.paidAt?.toISOString() ?? null,
      receivedAt: c.receivedAt?.toISOString() ?? null,
    })),
  });
}
