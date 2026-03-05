import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// GET /api/marketplace/shares/mine — sharer's ListingShare records with stats + claim info + winner info
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sharerId = parseInt(session.user.id);
  const shortBase = "https://hgfapp.link";

  const shares = await db.listingShare.findMany({
    where: { sharerId },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true, title: true, listingType: true, ogPrice: true,
          loveGiftAmount: true, status: true,
          photos: { take: 1, orderBy: { sortOrder: "asc" }, select: { photoPath: true } },
          seller: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      },
      claims: {
        select: {
          id: true, amount: true, method: true, status: true,
          gcashName: true, gcashMobile: true,
          createdAt: true, paidAt: true, receivedAt: true,
        },
      },
    },
  });

  // Aggregate impression + prospect stats per share code
  const shareCodes = shares.map((s) => s.shareCode).filter(Boolean);
  let impressionStats: { share_code: string; event: string; cnt: bigint }[] = [];
  try {
    if (shareCodes.length > 0) {
      impressionStats = await db.$queryRaw<{ share_code: string; event: string; cnt: bigint }[]>(
        Prisma.sql`
          SELECT share_code, event, COUNT(*) as cnt
          FROM marketplace_impressions
          WHERE share_code IN (${Prisma.join(shareCodes)})
          GROUP BY share_code, event
        `
      );
    }
  } catch (err) {
    console.error("Failed to fetch impression stats:", err);
  }

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

  // For sold listings, find who won the Love Gift (for other sharers to see)
  const soldListingIds = [...new Set(
    shares.filter((s) => s.listing.status === "sold").map((s) => s.listing.id)
  )];

  const winnerClaims = soldListingIds.length > 0
    ? await db.loveGiftClaim.findMany({
        where: { listingId: { in: soldListingIds } },
        select: {
          listingId: true, sharerId: true, amount: true, status: true,
          sharer: { select: { firstName: true, lastName: true } },
        },
      })
    : [];

  const winnerMap = new Map(
    winnerClaims.map((c) => [c.listingId, {
      sharerId: c.sharerId,
      sharerName: `${c.sharer.firstName} ${c.sharer.lastName}`,
      amount: Number(c.amount),
      status: c.status as string,
    }])
  );

  // Wallet summary
  const walletPending = shares.reduce((sum, s) => {
    const claim = s.claims[0];
    if (claim && claim.status === "pending") return sum + Number(claim.amount);
    return sum;
  }, 0);
  const walletPaid = shares.reduce((sum, s) => {
    const claim = s.claims[0];
    if (claim && (claim.status === "paid" || claim.status === "received")) return sum + Number(claim.amount);
    return sum;
  }, 0);
  const totalEarned = shares.reduce((s, sh) => s + Number(sh.loveGiftEarned ?? 0), 0);

  // Member's saved GCash for pre-fill
  const member = await db.member.findUnique({
    where: { id: sharerId },
    select: { gcashName: true, gcashMobile: true },
  });

  return NextResponse.json({
    wallet: {
      totalEarned,
      pending: walletPending,
      paid: walletPaid,
      confirmedSales: shares.filter((s) => s.status === "credited").length,
    },
    savedGCash: {
      name: member?.gcashName ?? null,
      mobile: member?.gcashMobile ?? null,
    },
    shares: shares.map((s) => {
      const isSold = s.listing.status === "sold";
      const claim = s.claims[0] ?? null;
      const winner = isSold ? winnerMap.get(s.listing.id) ?? null : null;
      const isWinner = winner?.sharerId === sharerId;

      return {
        id: s.id,
        shareCode: s.shareCode,
        shareLink: `${shortBase}/s/${s.shareCode}`,
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
          sellerName: `${s.listing.seller.firstName} ${s.listing.seller.lastName}`,
          sellerPhone: s.listing.seller.phone,
        },
        impressions: impMap[s.shareCode]?.impression ?? 0,
        ctaClicks: (impMap[s.shareCode]?.reveal_click ?? 0) + (impMap[s.shareCode]?.contact_click ?? 0),
        prospectCount: prospectMap[s.shareCode] ?? 0,
        // Session 2 additions:
        claim: claim ? {
          id: claim.id,
          amount: Number(claim.amount),
          method: claim.method as string,
          status: claim.status as string,
          gcashName: claim.gcashName,
          gcashMobile: claim.gcashMobile,
          paidAt: claim.paidAt?.toISOString() ?? null,
          receivedAt: claim.receivedAt?.toISOString() ?? null,
        } : null,
        winner: isSold && winner && !isWinner ? {
          name: winner.sharerName,
          amount: winner.amount,
          status: winner.status,
        } : null,
        isWinner,
      };
    }),
  });
}
