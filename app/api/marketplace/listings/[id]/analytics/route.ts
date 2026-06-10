import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const memberId = parseInt(session.user.id);

    const { id } = await params;
    const listingId = parseInt(id);

    // Verify ownership of the listing
    const listing = await db.marketplaceListing.findUnique({
      where: { id: listingId },
      select: { memberId: true },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.memberId !== memberId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all impressions for this listing
    const impressions = await db.marketplaceImpression.findMany({
      where: { listingId },
      orderBy: { createdAt: "desc" },
    });

    // Process statistics
    const totalViews = impressions.filter(i => i.event === "impression").length;
    const revealClicks = impressions.filter(i => i.event === "reveal_click").length;
    const contactClicks = impressions.filter(i => i.event === "contact_click").length;

    // Track unique and repeat views
    const viewerMap = new Map<string, { firstSeen: Date; viewsCount: number }>();
    
    // Process from oldest to newest to correctly determine "firstSeen"
    const chronologicalImpressions = [...impressions].reverse();
    chronologicalImpressions.forEach(imp => {
      if (imp.event !== "impression") return;
      const key = imp.ipAddress || imp.ipHash || "unknown";
      if (!viewerMap.has(key)) {
        viewerMap.set(key, { firstSeen: imp.createdAt, viewsCount: 1 });
      } else {
        const val = viewerMap.get(key)!;
        val.viewsCount += 1;
        viewerMap.set(key, val);
      }
    });

    const uniqueViewers = viewerMap.size;
    let repeatViewers = 0;
    viewerMap.forEach(v => {
      if (v.viewsCount > 1) repeatViewers++;
    });

    // Helper: Return actual IP (unmasked)
    const maskIp = (ip: string | null, hash: string | null): string => {
      if (!ip) {
        if (!hash) return "Unknown IP";
        return `anon-${hash.slice(0, 6)}`;
      }
      return ip;
    };

    // Location breakdown
    const locations: Record<string, number> = {};
    impressions.forEach(imp => {
      if (imp.event !== "impression") return;
      const countryStr = imp.country || "";
      const cityStr = imp.city || "";
      if (countryStr || cityStr) {
        const locKey = cityStr && countryStr ? `${cityStr}, ${countryStr}` : countryStr || cityStr;
        locations[locKey] = (locations[locKey] || 0) + 1;
      } else {
        locations["Unknown Location"] = (locations["Unknown Location"] || 0) + 1;
      }
    });

    // Format location array
    const locationBreakdown = Object.entries(locations)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Device breakdown helper
    const parseDevice = (ua: string | null): string => {
      if (!ua) return "Desktop";
      const uaLower = ua.toLowerCase();
      if (uaLower.includes("mobi") || uaLower.includes("android") || uaLower.includes("iphone") || uaLower.includes("ipad")) {
        return "Mobile";
      }
      return "Desktop";
    };

    // Format logs
    const logs = impressions.map(imp => {
      const isImp = imp.event === "impression";
      const key = imp.ipAddress || imp.ipHash || "unknown";
      const stats = viewerMap.get(key);
      const isRepeat = isImp && stats ? imp.createdAt > stats.firstSeen : false;

      let eventLabel = "Viewed Listing";
      if (imp.event === "reveal_click") eventLabel = "Clicked Reveal";
      if (imp.event === "contact_click") eventLabel = "Clicked Contact";

      return {
        id: imp.id,
        event: imp.event,
        eventLabel,
        time: imp.createdAt.toISOString(),
        maskedIp: maskIp(imp.ipAddress, imp.ipHash),
        location: imp.city && imp.country ? `${imp.city}, ${imp.country}` : imp.country || "Unknown Location",
        device: parseDevice(imp.userAgent),
        isRepeat,
      };
    });

    return NextResponse.json({
      totalViews,
      uniqueViewers,
      repeatViewers,
      revealClicks,
      contactClicks,
      locationBreakdown,
      logs: logs.slice(0, 50), // Send last 50 logs
    });
  } catch (error: any) {
    console.error("[api/marketplace/listings/analytics]", error?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
