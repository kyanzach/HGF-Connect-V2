import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { notifySharerProspect } from "@/lib/marketplace/notifySharer";

// POST /api/marketplace/prospects — log a reveal or contact prospect submission
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      listingId,
      actionType,       // "reveal" | "contact"
      shareToken,
      prospectName,
      prospectMobile,
      prospectEmail,
      consented,
    } = body;

    if (!listingId || !actionType || !prospectName?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify listing exists and is active
    const listing = await db.marketplaceListing.findUnique({
      where: { id: parseInt(listingId) },
      select: {
        id: true,
        title: true,
        ogPrice: true,
        discountedPrice: true,
        price: true,
        priceLabel: true,
        loveGiftAmount: true,
        seller: { select: { firstName: true, lastName: true } },
      },
    });
    if (!listing || listing.id === 0) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // IP hash for rate limiting / dedup (never store raw IP)
    const forwarded = req.headers.get("x-forwarded-for") ?? "unknown";
    const ip = forwarded.split(",")[0].trim();
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
    const userAgent = req.headers.get("user-agent") ?? "";

    // Resolve sharer user from share token if present
    let sharerUserId: number | null = null;
    if (shareToken) {
      const share = await db.listingShare.findFirst({
        where: { shareCode: shareToken, listingId: listing.id },
        select: { sharerId: true },
      }).catch(() => null);
      sharerUserId = share?.sharerId ?? null;
    }

    // Create prospect record (v1.1 §71-73)
    await db.marketplaceProspect.create({
      data: {
        listingId: listing.id,
        shareToken: shareToken ?? null,
        sharerUserId,
        prospectName: prospectName.trim(),
        prospectMobile: prospectMobile?.trim() || null,
        prospectEmail: prospectEmail?.trim() || null,
        ipHash,
        userAgent: userAgent.slice(0, 500),
        actionType,
        status: actionType === "contact" ? "contacted" : "revealed",
        consented: !!consented,
      },
    });

    // Phase 7: notify sharer (fire-and-forget)
    if (sharerUserId) {
      void notifySharerProspect(
        sharerUserId,
        listing.title,
        listing.id,
        prospectName.trim(),
        actionType as "reveal" | "contact"
      );
    }

    // Gate: only reveal discountedPrice AFTER prospect record saved (v1.1 §170)
    const discountedPrice = listing.discountedPrice
      ? Number(listing.discountedPrice)
      : null;
    const ogPrice = listing.ogPrice
      ? Number(listing.ogPrice)
      : listing.price
        ? Number(listing.price)
        : null;

    return NextResponse.json({
      success: true,
      actionType,
      discountedPrice,   // Now safely revealed
      ogPrice,
      sellerName: `${listing.seller.firstName} ${listing.seller.lastName}`,
      loveGiftAmount: listing.loveGiftAmount,
      couponCode: shareToken ?? null,       // e.g. "RYANP01" — show to buyer, they quote to seller
    });

  } catch (err) {
    console.error("[marketplace/prospects]", (err as Error).message);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
