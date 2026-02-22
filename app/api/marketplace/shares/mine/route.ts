import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// GET /api/marketplace/shares/mine — sharer's ListingShare records with stats
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sharerId = parseInt(session.user.id);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://connect.houseofgrace.ph";

  const shares = await db.listingShare.findMany({
    where: { sharerId },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true, title: true, listingType: true, ogPrice: true,
          loveGiftAmount: true, status: true,
          photos: { take: 1, orderBy: { sortOrder: "asc" }, select: { photoPath: true } },
        },
      },
    },
  });

  // Aggregate impression + prospect stats per share code
  const shareCodes = shares.map((s) => s.shareCode).filter(Boolean);
  const impressionStats = shareCodes.length > 0
    ? await db.$queryRaw<{ share_code: string; event: string; cnt: bigint }[]>(
        Prisma.sql`
          SELECT share_code, event, COUNT(*) as cnt
          FROM marketplace_impressions
          WHERE share_code IN (${Prisma.join(shareCodes)})
          GROUP BY share_code, event
        `
      )
    : [];

  const prospectStats = shares.length > 0
    ? await db.marketplaceProspect.groupBy({
        by: ["shareToken"],
        where: { shareToken: { in: shareCodes } },
        _count: { id: true },
      })
    : [];

  // Build lookup maps
  type StatMap = Record<string, Record<string, number>>;
  const impMap: StatMap = {};
  for (const row of impressionStats) {
    const code = row.share_code;
    if (!impMap[code]) impMap[code] = {};
    impMap[code][row.event] = Number(row.cnt);
  }
  const prospectMap: Record<string, number> = {};
  for (const row of prospectStats) {
    if (row.shareToken) prospectMap[row.shareToken] = row._count.id;
  }

  return NextResponse.json({
    shares: shares.map((s) => ({
      id: s.id,
      shareCode: s.shareCode,
      shareLink: `${baseUrl}/marketplace/${s.listingId}?ref=${s.shareCode}`,
      loveGiftEarned: Number(s.loveGiftEarned ?? 0),
      status: s.status as string,
      createdAt: s.createdAt.toISOString(),
      listing: {
        id: s.listing.id,
        title: s.listing.title,
        listingType: s.listing.listingType as string,
        ogPrice: s.listing.ogPrice ? Number(s.listing.ogPrice) : null,
        loveGiftAmount: Number(s.listing.loveGiftAmount ?? 0),
        status: s.listing.status as string,
        photo: s.listing.photos[0]?.photoPath ?? null,
      },
      impressions: impMap[s.shareCode]?.impression ?? 0,
      ctaClicks: (impMap[s.shareCode]?.reveal_click ?? 0) + (impMap[s.shareCode]?.contact_click ?? 0),
      prospectCount: prospectMap[s.shareCode] ?? 0,
    })),
  });
}
