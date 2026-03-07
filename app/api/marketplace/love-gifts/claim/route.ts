import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * POST /api/marketplace/love-gifts/claim
 * Sharer submits a Love Gift claim — either "contact" or "gcash" method.
 * If GCash, validates and auto-saves details to member profile.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sharerId = parseInt(session.user.id);

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { claimId, method, gcashName, gcashMobile } = body;

  if (!claimId || !method || !["contact", "gcash"].includes(method)) {
    return NextResponse.json({ error: "claimId and method (contact|gcash) required" }, { status: 400 });
  }

  // Load existing pending claim
  const claim = await db.loveGiftClaim.findUnique({
    where: { id: Number(claimId) },
    select: { id: true, sharerId: true, sellerId: true, status: true, amount: true, listingId: true },
  });

  if (!claim || claim.sharerId !== sharerId) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.status !== "pending") {
    return NextResponse.json({ error: `Claim already ${claim.status}` }, { status: 400 });
  }

  // Validate GCash details if method is gcash
  if (method === "gcash") {
    if (!gcashName?.trim() || !gcashMobile?.trim()) {
      return NextResponse.json({ error: "GCash name and mobile required" }, { status: 400 });
    }
    const cleanMobile = gcashMobile.trim();
    if (!/^09\d{9}$/.test(cleanMobile)) {
      return NextResponse.json({ error: "GCash mobile must be 11 digits starting with 09" }, { status: 400 });
    }
  }

  // Update claim + auto-save GCash to profile
  await db.$transaction(async (tx) => {
    // Update claim with method and GCash details
    await tx.loveGiftClaim.update({
      where: { id: claim.id },
      data: {
        method,
        ...(method === "gcash" ? {
          gcashName: gcashName?.trim(),
          gcashMobile: gcashMobile?.trim(),
        } : {}),
      },
    });

    // Auto-save GCash details to member profile (smart save)
    if (method === "gcash") {
      await tx.member.update({
        where: { id: sharerId },
        data: {
          gcashName: gcashName?.trim(),
          gcashMobile: gcashMobile?.trim(),
        },
      });
    }
  });

  // Notification to seller
  try {
    const sharer = await db.member.findUnique({
      where: { id: sharerId },
      select: { firstName: true, lastName: true },
    });
    const sharerName = `${sharer?.firstName ?? ""} ${sharer?.lastName ?? ""}`.trim();

    if (method === "gcash") {
      await db.notification.create({
        data: {
          memberId: claim.sellerId,
          type: "love_gift_claim",
          title: "📩 GCash Payment Request",
          body: `${sharerName} requests ₱${Number(claim.amount).toLocaleString()} via GCash for Love Gift. Tap to view details.`,
          link: `/stewardshop/my-listings/${claim.listingId}/prospects`,
        },
      });
    } else {
      await db.notification.create({
        data: {
          memberId: claim.sellerId,
          type: "love_gift_claim",
          title: "📞 Love Gift Contact Request",
          body: `${sharerName} wants to discuss their ₱${Number(claim.amount).toLocaleString()} Love Gift. They'll reach out to you.`,
          link: `/stewardshop/my-listings/${claim.listingId}/prospects`,
        },
      });
    }
  } catch (err) {
    console.error("Failed to send notification:", err);
  }

  return NextResponse.json({
    ok: true,
    message: method === "gcash"
      ? "GCash request sent! The seller will see your details."
      : "Contact request noted. You can now reach out to the seller.",
  });
}

/**
 * GET /api/marketplace/love-gifts/claim?sharerId=me
 * Returns pending claims for this sharer (used by My Share Links to show claim buttons).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sharerId = parseInt(session.user.id);

  const claims = await db.loveGiftClaim.findMany({
    where: { sharerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, listingId: true, listingShareId: true,
      amount: true, method: true, status: true,
      gcashName: true, gcashMobile: true,
      createdAt: true, paidAt: true, receivedAt: true,
    },
  });

  // Also fetch member's saved GCash details for pre-fill
  const member = await db.member.findUnique({
    where: { id: sharerId },
    select: { gcashName: true, gcashMobile: true },
  });

  return NextResponse.json({
    claims: claims.map((c) => ({
      id: c.id,
      listingId: c.listingId,
      listingShareId: c.listingShareId,
      amount: Number(c.amount),
      method: c.method,
      status: c.status,
      gcashName: c.gcashName,
      gcashMobile: c.gcashMobile,
      createdAt: c.createdAt.toISOString(),
      paidAt: c.paidAt?.toISOString() ?? null,
      receivedAt: c.receivedAt?.toISOString() ?? null,
    })),
    savedGCash: {
      name: member?.gcashName ?? null,
      mobile: member?.gcashMobile ?? null,
    },
  });
}
