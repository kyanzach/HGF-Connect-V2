import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /s/{code} — Short link redirect for StewardShop share links.
 * Looks up the shareCode in listing_shares, records an impression,
 * and 302 redirects to the full listing page on the main domain.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code) {
    return NextResponse.redirect("https://houseofgrace.ph", 302);
  }

  // 1. Try to look up the code as a referral shareCode first
  const share = await db.listingShare.findFirst({
    where: { shareCode: code },
    select: { listingId: true, shareCode: true },
  });

  if (share) {
    // Record referral impression (fire-and-forget)
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO marketplace_impressions (listing_id, share_code, event, created_at)
         VALUES (?, ?, 'impression', NOW())`,
        share.listingId,
        share.shareCode
      );
    } catch {
      // Non-critical
    }
    // Redirect to full listing page with referral code
    return NextResponse.redirect(`https://connect.houseofgrace.ph/stewardshop/${share.listingId}?ref=${share.shareCode}`, 302);
  }

  // 2. If not a referral shareCode, check if the code is numeric (direct listing ID lookup)
  const isNumeric = /^\d+$/.test(code);
  if (isNumeric) {
    const listingId = parseInt(code);
    const listing = await db.marketplaceListing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (listing) {
      try {
        await db.$executeRawUnsafe(
          `INSERT INTO marketplace_impressions (listing_id, share_code, event, created_at)
           VALUES (?, NULL, 'impression', NOW())`,
          listingId
        );
      } catch {}
      return NextResponse.redirect(`https://connect.houseofgrace.ph/stewardshop/${listingId}`, 302);
    }
  }

  // 3. Check if it is a slug ending in a numeric ID (e.g. "rockford-mixer-21")
  const match = code.match(/-?(\d+)$/);
  if (match) {
    const listingId = parseInt(match[1]);
    if (!Number.isNaN(listingId)) {
      const listing = await db.marketplaceListing.findUnique({
        where: { id: listingId },
        select: { id: true },
      });
      if (listing) {
        try {
          await db.$executeRawUnsafe(
            `INSERT INTO marketplace_impressions (listing_id, share_code, event, created_at)
             VALUES (?, NULL, 'impression', NOW())`,
            listingId
          );
        } catch {}
        return NextResponse.redirect(`https://connect.houseofgrace.ph/stewardshop/${listingId}`, 302);
      }
    }
  }

  // 4. Try resolving as a pretty slug by matching active listings' title slugs
  const activeListings = await db.marketplaceListing.findMany({
    where: { status: "active" },
    select: { id: true, title: true },
  });

  const targetSlug = code.toLowerCase().trim();
  for (const listing of activeListings) {
    const slug = listing.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40)
      .replace(/-+$/, "");
    if (slug === targetSlug || (slug || String(listing.id)) === targetSlug) {
      try {
        await db.$executeRawUnsafe(
          `INSERT INTO marketplace_impressions (listing_id, share_code, event, created_at)
           VALUES (?, NULL, 'impression', NOW())`,
          listing.id
        );
      } catch {}
      return NextResponse.redirect(`https://connect.houseofgrace.ph/stewardshop/${listing.id}`, 302);
    }
  }

  // 5. Fallback/Invalid code → redirect to main site
  return NextResponse.redirect("https://houseofgrace.ph", 302);
}
