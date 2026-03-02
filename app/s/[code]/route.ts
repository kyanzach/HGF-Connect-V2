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

  // Look up the share code
  const share = await db.listingShare.findFirst({
    where: { shareCode: code },
    select: { listingId: true, shareCode: true },
  });

  if (!share) {
    // Invalid code → redirect to main site
    return NextResponse.redirect("https://houseofgrace.ph", 302);
  }

  // Record an impression (fire-and-forget)
  try {
    await db.$executeRawUnsafe(
      `INSERT INTO marketplace_impressions (listing_id, share_code, event, created_at)
       VALUES (?, ?, 'impression', NOW())`,
      share.listingId,
      share.shareCode
    );
  } catch {
    // Non-critical — don't block redirect
  }

  // 302 redirect to the full listing page with referral code
  const destination = `https://connect.houseofgrace.ph/stewardshop/${share.listingId}?ref=${share.shareCode}`;
  return NextResponse.redirect(destination, 302);
}
