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

  if (!code || code.length < 3) {
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

  // 2. If not a referral shareCode, try to parse it as a listing slug/ID
  // Matches numeric ID at the end of the slug, e.g. "rockford-mixer-21" or "21"
  const match = code.match(/-?(\d+)$/);
  if (match) {
    const listingId = parseInt(match[1]);
    if (!Number.isNaN(listingId)) {
      // Verify listing exists
      const listing = await db.marketplaceListing.findUnique({
        where: { id: listingId },
        select: { id: true },
      });
      if (listing) {
        // Record direct impression (no share_code)
        try {
          await db.$executeRawUnsafe(
            `INSERT INTO marketplace_impressions (listing_id, share_code, event, created_at)
             VALUES (?, NULL, 'impression', NOW())`,
            listingId
          );
        } catch {
          // Non-critical
        }
        // Redirect directly
        return NextResponse.redirect(`https://connect.houseofgrace.ph/stewardshop/${listingId}`, 302);
      }
    }
  }

  // 3. Fallback/Invalid code → redirect to main site
  return NextResponse.redirect("https://houseofgrace.ph", 302);
}
