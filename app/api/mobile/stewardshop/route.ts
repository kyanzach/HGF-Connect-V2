import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { createNotification, notifyAllMembers } from "@/lib/notify";
import { callOpenAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

function buildCouponCode(prefixSource: string, titleSource?: string): string {
  const cleanPrefix = (prefixSource || "HGF")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4) || "HGF";
  const cleanTitle = (titleSource || "LOVE")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 3) || "LVE";
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanPrefix}-${cleanTitle}-${rand}`;
}

function buildDeterministicCoupon(listingId: number, prospectId: number, shareToken?: string | null): string {
  if (shareToken) return shareToken.toUpperCase();
  return `LOVE-${listingId}-${prospectId}`;
}

function mapListing(l: any, memberId?: number) {
  const ogPrice =
    l.ogPrice !== null && l.ogPrice !== undefined
      ? Number(l.ogPrice)
      : l.price !== null && l.price !== undefined
      ? Number(l.price)
      : null;
  const discountedPrice =
    l.discountedPrice !== null && l.discountedPrice !== undefined
      ? Number(l.discountedPrice)
      : null;
  const hasDiscount = Boolean(
    discountedPrice !== null &&
      ogPrice !== null &&
      discountedPrice > 0 &&
      discountedPrice < ogPrice
  );
  const discountPercent =
    hasDiscount && ogPrice
      ? Math.round(((ogPrice - (discountedPrice || 0)) / ogPrice) * 100)
      : 0;

  return {
    id: l.id,
    memberId: l.memberId,
    isOwner: Boolean(memberId && l.memberId === memberId),
    title: l.title,
    description: l.description || "",
    listingType: l.listingType,
    status: l.status,
    isPrivate: Boolean(l.isPrivate),
    moderationReason: l.moderationReason || null,
    category: l.category || "General",
    ogPrice,
    price: ogPrice,
    discountedPrice,
    hasDiscount,
    discountPercent,
    priceLabel: l.priceLabel || null,
    conditionType: l.conditionType || null,
    locationArea: l.locationArea || "General Santos City",
    loveGiftAmount: l.loveGiftAmount ? Number(l.loveGiftAmount) : 0,
    videoUrl: l.videoUrl || null,
    viewCount: l.viewCount || l._count?.impressions || 0,
    prospectCount: l._count?.prospects || 0,
    shareCount: l._count?.shares || 0,
    messageCount: l._count?.messages || 0,
    createdAt:
      l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt),
    seller: l.seller
      ? {
          id: l.seller.id,
          firstName: l.seller.firstName,
          lastName: l.seller.lastName,
          name: `${l.seller.firstName} ${l.seller.lastName}`.trim(),
          phone: l.seller.phone || null,
          createdAt: l.seller.createdAt
            ? new Date(l.seller.createdAt).toISOString()
            : null,
          isVerified: Boolean(l.seller.isVerified),
          avatar: l.seller.profilePicture
            ? l.seller.profilePicture.startsWith("http")
              ? l.seller.profilePicture
              : `https://connect.houseofgrace.ph/uploads/profile_pictures/${l.seller.profilePicture}`
            : null,
        }
      : null,
    photos: (l.photos || []).map((p: any) =>
      p.photoPath.startsWith("http")
        ? p.photoPath
        : `https://connect.houseofgrace.ph/uploads/marketplace/${p.photoPath}`
    ),
    rawPhotoPaths: (l.photos || []).map((p: any) => p.photoPath),
  };
}

export async function GET(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "all";
    const listingTypeParam =
      searchParams.get("type") || searchParams.get("listingType") || "all";
    const search = (
      searchParams.get("q") ||
      searchParams.get("search") ||
      ""
    ).trim();
    const minPrice = searchParams.get("minPrice")
      ? Number(searchParams.get("minPrice"))
      : null;
    const maxPrice = searchParams.get("maxPrice")
      ? Number(searchParams.get("maxPrice"))
      : null;
    const singleId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
    const prospectsFor = searchParams.get("prospectsFor")
      ? Number(searchParams.get("prospectsFor"))
      : null;
    const analyticsFor = searchParams.get("analyticsFor")
      ? Number(searchParams.get("analyticsFor"))
      : null;
    const sharesMode = searchParams.get("shares");

    // 1. Seller Prospects List + Love Gift Claims for a specific listing
    if (prospectsFor && member) {
      const listing = await db.marketplaceListing.findUnique({
        where: { id: prospectsFor },
        select: {
          id: true,
          title: true,
          memberId: true,
          status: true,
          loveGiftAmount: true,
        },
      });
      if (
        !listing ||
        (listing.memberId !== member.id &&
          member.role !== "admin" &&
          member.role !== "moderator")
      ) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 }
        );
      }
      const prospects = await db.marketplaceProspect.findMany({
        where: { listingId: prospectsFor },
        orderBy: { createdAt: "desc" },
      });

      const sharerIds = Array.from(
        new Set(prospects.map((p) => p.sharerUserId).filter(Boolean))
      ) as number[];
      const sharerMap = new Map<number, string>();
      if (sharerIds.length > 0) {
        const sharers = await db.member.findMany({
          where: { id: { in: sharerIds } },
          select: { id: true, firstName: true, lastName: true },
        });
        for (const s of sharers) {
          sharerMap.set(s.id, `${s.firstName} ${s.lastName}`.trim());
        }
      }

      let claims: any[] = [];
      try {
        claims = (await db.$queryRawUnsafe(
          `SELECT c.id, c.listing_id as listingId, c.share_id as shareId, c.sharer_id as sharerId,
                  c.seller_id as sellerId, c.amount, c.method, c.gcash_name as gcashName,
                  c.gcash_mobile as gcashMobile, c.status, c.created_at as createdAt,
                  c.paid_at as paidAt, c.received_at as receivedAt, c.thank_you_note as thankYouNote,
                  m.first_name as sharerFirstName, m.last_name as sharerLastName, m.phone as sharerPhone
           FROM love_gift_claims c
           LEFT JOIN members m ON m.id = c.sharer_id
           WHERE c.listing_id = ?
           ORDER BY c.created_at DESC`,
          prospectsFor
        )) as any[];
      } catch {}

      return NextResponse.json({
        success: true,
        data: {
          listing: {
            id: listing.id,
            title: listing.title,
            status: listing.status,
            loveGiftAmount: listing.loveGiftAmount
              ? Number(listing.loveGiftAmount)
              : 0,
          },
          prospects: prospects.map((p) => ({
            id: p.id,
            prospectName: p.prospectName,
            prospectMobile: p.prospectMobile,
            prospectEmail: p.prospectEmail,
            actionType: p.actionType,
            couponCode: buildDeterministicCoupon(listing.id, p.id, p.shareToken),
            status: p.status,
            shareCode: p.shareToken,
            sharerName: p.sharerUserId
              ? sharerMap.get(p.sharerUserId) || null
              : null,
            createdAt: p.createdAt.toISOString(),
          })),
          claims: claims.map((c: any) => ({
            id: Number(c.id),
            listingId: Number(c.listingId),
            shareId: Number(c.shareId),
            sharerId: Number(c.sharerId),
            amount: Number(c.amount || 0),
            method: c.method,
            gcashName: c.gcashName,
            gcashMobile: c.gcashMobile,
            status: c.status,
            sharerName: `${c.sharerFirstName || ""} ${c.sharerLastName || ""}`.trim(),
            sharerPhone: c.sharerPhone || null,
            thankYouNote: c.thankYouNote || null,
            createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
          })),
        },
      });
    }

    // 2. Listing Analytics Modal data
    if (analyticsFor && member) {
      const listing = await db.marketplaceListing.findUnique({
        where: { id: analyticsFor },
        include: {
          _count: { select: { impressions: true, prospects: true, shares: true } },
          shares: {
            include: {
              sharer: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          prospects: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
      if (!listing) {
        return NextResponse.json(
          { success: false, message: "Not found" },
          { status: 404 }
        );
      }

      const totalViews = Math.max(
        listing.viewCount || 0,
        listing._count.impressions || 0
      );
      const uniqueViews = totalViews;
      const totalProspects = listing._count.prospects || 0;
      const conversionRate =
        totalViews > 0 ? Math.round((totalProspects / totalViews) * 100) : 0;

      return NextResponse.json({
        success: true,
        data: {
          views: totalViews,
          uniqueViews,
          shares: listing._count.shares || 0,
          prospects: totalProspects,
          conversionRate,
          topSharers: listing.shares.map((s) => {
            const leadsCount = listing.prospects.filter(
              (p) => p.shareToken === s.shareCode || p.sharerUserId === s.sharerId
            ).length;
            return {
              id: s.id,
              name: `${s.sharer.firstName} ${s.sharer.lastName}`.trim(),
              code: s.shareCode,
              clicks: leadsCount,
              ctaClicks: leadsCount,
              leads: leadsCount,
            };
          }),
          recentProspects: listing.prospects.slice(0, 10).map((p) => ({
            id: p.id,
            name: p.prospectName,
            actionType: p.actionType,
            status: p.status,
            createdAt: p.createdAt.toISOString(),
          })),
        },
      });
    }

    // 3. My Shares / Love Gifts Wallet Dashboard
    if (sharesMode === "mine" && member) {
      const shares = await db.listingShare.findMany({
        where: { sharerId: member.id },
        orderBy: { createdAt: "desc" },
        include: {
          listing: {
            include: {
              photos: { orderBy: { sortOrder: "asc" }, take: 1 },
              seller: {
                select: { id: true, firstName: true, lastName: true, phone: true },
              },
              prospects: {
                where: { sharerUserId: member.id },
                select: { id: true },
              },
            },
          },
        },
      });

      let claims: any[] = [];
      try {
        claims = (await db.$queryRawUnsafe(
          `SELECT id, listing_id as listingId, share_id as shareId, amount, method,
                  gcash_name as gcashName, gcash_mobile as gcashMobile, status,
                  created_at as createdAt, paid_at as paidAt, received_at as receivedAt,
                  thank_you_note as thankYouNote
           FROM love_gift_claims WHERE sharer_id = ?`,
          member.id
        )) as any[];
      } catch {}

      const claimByShareId = new Map<number, any>();
      for (const c of claims) {
        claimByShareId.set(Number(c.shareId), {
          id: Number(c.id),
          listingId: Number(c.listingId),
          shareId: Number(c.shareId),
          amount: Number(c.amount || 0),
          method: c.method,
          gcashName: c.gcashName,
          gcashMobile: c.gcashMobile,
          status: c.status,
          thankYouNote: c.thankYouNote || null,
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
        });
      }

      let totalEarned = 0;
      let pendingAmount = 0;
      let receivedAmount = 0;
      let totalConversions = 0;

      const mappedShares = shares.map((s) => {
        const claim = claimByShareId.get(s.id) || null;
        const reward =
          s.loveGiftEarned && Number(s.loveGiftEarned) > 0
            ? Number(s.loveGiftEarned)
            : s.listing.loveGiftAmount
            ? Number(s.listing.loveGiftAmount)
            : 0;
        if (s.status === "converted" || s.status === "paid" || claim) {
          totalConversions += 1;
          totalEarned += reward;
          if (claim?.status === "received" || s.status === "paid") {
            receivedAmount += reward;
          } else {
            pendingAmount += reward;
          }
        }
        const photo = s.listing.photos?.[0]?.photoPath;
        const prospectCount = s.listing.prospects?.length || 0;
        return {
          id: s.id,
          shareCode: s.shareCode,
          shareUrl: `https://hgfapp.link/s/${s.shareCode}`,
          impressions: prospectCount,
          ctaClicks: prospectCount,
          prospectCount,
          status: s.status,
          rewardAmount: reward,
          createdAt: s.createdAt.toISOString(),
          claim,
          listing: {
            id: s.listing.id,
            title: s.listing.title,
            status: s.listing.status,
            ogPrice: s.listing.ogPrice
              ? Number(s.listing.ogPrice)
              : s.listing.price
              ? Number(s.listing.price)
              : null,
            discountedPrice: s.listing.discountedPrice
              ? Number(s.listing.discountedPrice)
              : null,
            loveGiftAmount: s.listing.loveGiftAmount
              ? Number(s.listing.loveGiftAmount)
              : 0,
            sellerName: `${s.listing.seller.firstName} ${s.listing.seller.lastName}`.trim(),
            sellerPhone: s.listing.seller.phone || null,
            thumbnail: photo
              ? photo.startsWith("http")
                ? photo
                : `https://connect.houseofgrace.ph/uploads/marketplace/${photo}`
              : null,
          },
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalShares: shares.length,
            totalConversions,
            totalEarned,
            pendingAmount,
            receivedAmount,
          },
          shares: mappedShares,
        },
      });
    }

    // 4. Single Listing Detail
    if (singleId) {
      const l = await db.marketplaceListing.findUnique({
        where: { id: singleId },
        include: {
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              profilePicture: true,
              isVerified: true,
              createdAt: true,
            },
          },
          photos: { orderBy: { sortOrder: "asc" } },
          _count: {
            select: {
              prospects: true,
              messages: true,
              shares: true,
              impressions: true,
            },
          },
        },
      });
      if (!l) {
        return NextResponse.json(
          { success: false, message: "Listing not found" },
          { status: 404 }
        );
      }

      // Increment viewCount silently
      db.marketplaceListing
        .update({ where: { id: singleId }, data: { viewCount: { increment: 1 } } })
        .catch(() => {});

      let previouslyRevealed: any = null;
      let myShare: any = null;

      if (member) {
        const fullName = `${member.firstName} ${member.lastName}`.trim();
        const existingProspect = await db.marketplaceProspect.findFirst({
          where: {
            listingId: singleId,
            OR: [
              ...(member.phone ? [{ prospectMobile: member.phone }] : []),
              { prospectName: fullName },
            ],
          },
          orderBy: { createdAt: "desc" },
        });
        if (existingProspect) {
          previouslyRevealed = {
            prospectId: existingProspect.id,
            actionType: existingProspect.actionType,
            couponCode: buildDeterministicCoupon(
              singleId,
              existingProspect.id,
              existingProspect.shareToken
            ),
            discountedPrice: l.discountedPrice ? Number(l.discountedPrice) : null,
            ogPrice: l.ogPrice
              ? Number(l.ogPrice)
              : l.price
              ? Number(l.price)
              : null,
            sellerName: `${l.seller.firstName} ${l.seller.lastName}`.trim(),
            sellerMobile: l.seller.phone || null,
          };
        }

        const existingShare = await db.listingShare.findFirst({
          where: { listingId: singleId, sharerId: member.id },
        });
        if (existingShare) {
          const shareProspectCount = await db.marketplaceProspect.count({
            where: { listingId: singleId, sharerUserId: member.id },
          });
          myShare = {
            id: existingShare.id,
            shareCode: existingShare.shareCode,
            shareUrl: `https://hgfapp.link/s/${existingShare.shareCode}`,
            impressions: shareProspectCount,
            ctaClicks: shareProspectCount,
            prospectCount: shareProspectCount,
          };
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          listing: mapListing(l, member?.id),
          previouslyRevealed,
          myShare,
        },
      });
    }

    // 5. Default: Marketplace Browse + myListings + myShares summary
    const where: any = {};
    if (category === "mine" && member) {
      where.memberId = member.id;
      where.status = { in: ["active", "sold", "reserved", "expired"] };
    } else {
      where.status = "active";
      where.isPrivate = false;
      if (category && category !== "all" && category !== "mine") {
        if (
          ["sale", "free", "trade", "service", "rent", "official_store"].includes(
            category
          )
        ) {
          where.listingType = category;
        } else {
          where.category = category;
        }
      }
      if (listingTypeParam && listingTypeParam !== "all") {
        where.listingType = listingTypeParam;
      }
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { description: { contains: search } },
          { category: { contains: search } },
          { locationArea: { contains: search } },
        ];
      }
      if (minPrice !== null && !isNaN(minPrice)) {
        where.ogPrice = { ...(where.ogPrice || {}), gte: minPrice };
      }
      if (maxPrice !== null && !isNaN(maxPrice)) {
        where.ogPrice = { ...(where.ogPrice || {}), lte: maxPrice };
      }
    }

    const listings = await db.marketplaceListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            profilePicture: true,
            isVerified: true,
            createdAt: true,
          },
        },
        photos: {
          orderBy: { sortOrder: "asc" },
          take: 5,
        },
        _count: {
          select: {
            prospects: true,
            messages: true,
            shares: true,
            impressions: true,
          },
        },
      },
    });

    let myListings: any[] = [];
    let lastLocationArea = "General Santos City";
    if (member) {
      const rawMine = await db.marketplaceListing.findMany({
        where: { memberId: member.id, status: { not: "removed" } },
        orderBy: { createdAt: "desc" },
        include: {
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              profilePicture: true,
              isVerified: true,
              createdAt: true,
            },
          },
          photos: { orderBy: { sortOrder: "asc" }, take: 5 },
          _count: {
            select: {
              prospects: true,
              messages: true,
              shares: true,
              impressions: true,
            },
          },
        },
      });
      myListings = rawMine.map((l) => mapListing(l, member.id));
      if (rawMine[0]?.locationArea) {
        lastLocationArea = rawMine[0].locationArea;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        listings: listings.map((l) => mapListing(l, member?.id)),
        myListings,
        lastLocationArea,
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/stewardshop GET]", err?.message);
    return NextResponse.json(
      { success: false, message: "Failed to load StewardShop" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member || member.status === "pending") {
      return NextResponse.json(
        { success: false, message: "Approved member account required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = String(body?.action || "create_listing");

    // 1. AI Enhance Title or Description
    if (action === "enhance_listing") {
      const target = body?.target === "title" ? "title" : "description";
      const listingType = String(body?.listingType || "sale");
      const category = String(body?.category || "General");
      const condition = String(body?.condition || "Good");
      const title = String(body?.title || "").trim();
      const description = String(body?.description || "").trim();

      const systemPrompt =
        target === "title"
          ? "You are a helpful copywriter for a Christian community marketplace called StewardShop in General Santos City, Philippines. Rewrite or improve the item/service title so it is clear, attractive, trustworthy, and concise (max 75 characters). Return ONLY the improved title text with no quotes."
          : "You are a helpful copywriter for a Christian community marketplace called StewardShop in General Santos City, Philippines. Write or improve the listing description so it is warm, honest, clear, and well-structured (2 to 4 short sentences, max 450 characters). Highlight key details and value. Return ONLY the improved description text with no quotes.";

      const userPrompt = `Listing Type: ${listingType}\nCategory: ${category}\nCondition: ${condition}\nCurrent Title: ${title}\nCurrent Description: ${description}`;
      const enhanced =
        (await callOpenAI({
          systemPrompt,
          userPrompt,
          maxTokens: 220,
          temperature: 0.7,
        })) || "";

      return NextResponse.json({
        success: true,
        data: { enhanced: enhanced.replace(/^["']|["']$/g, "").trim() },
      });
    }

    // 2. Generate Share Link & Coupon Code ("Share & Bless")
    if (action === "generate_share") {
      const listingId = Number(body?.listingId);
      const listing = await db.marketplaceListing.findUnique({
        where: { id: listingId },
        select: { id: true, title: true, memberId: true },
      });
      if (!listing) {
        return NextResponse.json(
          { success: false, message: "Listing not found" },
          { status: 404 }
        );
      }

      let share = await db.listingShare.findFirst({
        where: { listingId, sharerId: member.id },
      });

      if (!share) {
        let code = buildCouponCode(member.firstName, listing.title);
        for (let i = 0; i < 5; i++) {
          const exists = await db.listingShare.findUnique({
            where: { shareCode: code },
          });
          if (!exists) break;
          code = buildCouponCode(member.firstName, listing.title);
        }
        share = await db.listingShare.create({
          data: {
            listingId,
            sharerId: member.id,
            shareCode: code,
          },
        });
      }

      const shareProspectCount = await db.marketplaceProspect.count({
        where: { listingId, sharerUserId: member.id },
      });

      return NextResponse.json({
        success: true,
        data: {
          shareId: share.id,
          shareCode: share.shareCode,
          shareUrl: `https://hgfapp.link/s/${share.shareCode}`,
          impressions: shareProspectCount,
          ctaClicks: shareProspectCount,
        },
      });
    }

    // 3. Prospect Gate: Reveal Discount & Get Code OR Contact the Seller
    if (action === "prospect" || action === "inquire") {
      const listingId = Number(body?.listingId);
      const actionType = body?.actionType === "reveal" ? "reveal" : "contact";
      const prospectName = String(
        body?.prospectName || `${member.firstName} ${member.lastName}`.trim()
      ).trim();
      const prospectMobile = String(
        body?.prospectMobile || member.phone || ""
      ).trim();
      const prospectEmail =
        String(body?.prospectEmail || member.email || "").trim() || null;
      const shareCode = body?.shareCode ? String(body.shareCode).trim() : null;

      if (!prospectName || !prospectMobile) {
        return NextResponse.json(
          {
            success: false,
            message: "Please provide your name and mobile number.",
          },
          { status: 400 }
        );
      }

      const listing = await db.marketplaceListing.findUnique({
        where: { id: listingId },
        include: {
          seller: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
      });
      if (!listing) {
        return NextResponse.json(
          { success: false, message: "Listing not found" },
          { status: 404 }
        );
      }

      const shareRecord = shareCode
        ? await db.listingShare.findUnique({ where: { shareCode } })
        : null;

      let existing = await db.marketplaceProspect.findFirst({
        where: {
          listingId,
          prospectMobile,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!existing) {
        existing = await db.marketplaceProspect.create({
          data: {
            listingId,
            shareToken: shareRecord?.shareCode || shareCode || null,
            sharerUserId: shareRecord?.sharerId || null,
            prospectName,
            prospectMobile,
            prospectEmail,
            actionType: actionType as any,
            consented: true,
          },
        });

        const generatedCoupon = buildDeterministicCoupon(
          listing.id,
          existing.id,
          existing.shareToken
        );

        // Notify Seller
        if (listing.memberId !== member.id) {
          createNotification({
            memberId: listing.memberId,
            type: "marketplace_prospect",
            title:
              actionType === "reveal"
                ? `🎟️ ${prospectName} revealed your discount on "${listing.title}"`
                : `💬 ${prospectName} requested your contact for "${listing.title}"`,
            body: `Mobile: ${prospectMobile} • Code: ${generatedCoupon}`,
            link: `/stewardshop/my-listings/${listing.id}/prospects`,
            actorId: member.id,
          }).catch(() => {});
        }

        // Notify Sharer if different
        if (
          shareRecord &&
          shareRecord.sharerId !== member.id &&
          shareRecord.sharerId !== listing.memberId
        ) {
          createNotification({
            memberId: shareRecord.sharerId,
            type: "marketplace_prospect",
            title: `🎉 Someone used your share link for "${listing.title}"!`,
            body: `${prospectName} unlocked the offer using your link.`,
            link: `/stewardshop/my-shares`,
            actorId: member.id,
          }).catch(() => {});
        }
      }

      const couponCode = buildDeterministicCoupon(
        listing.id,
        existing.id,
        existing.shareToken
      );
      const ogPrice = listing.ogPrice
        ? Number(listing.ogPrice)
        : listing.price
        ? Number(listing.price)
        : null;
      const discountedPrice = listing.discountedPrice
        ? Number(listing.discountedPrice)
        : null;

      return NextResponse.json({
        success: true,
        data: {
          prospectId: existing.id,
          actionType,
          couponCode,
          ogPrice,
          discountedPrice,
          loveGiftAmount: listing.loveGiftAmount
            ? Number(listing.loveGiftAmount)
            : 0,
          sellerName: `${listing.seller.firstName} ${listing.seller.lastName}`.trim(),
          sellerMobile: listing.seller.phone || null,
        },
        message:
          actionType === "reveal"
            ? "Discount unlocked! Here is your coupon code."
            : "Seller contact details unlocked!",
      });
    }

    // 4. Mark Listing as Sold (with optional Prospect & Sharer Love Gift conversion)
    if (action === "mark_sold") {
      const listingId = Number(body?.listingId);
      const prospectId = body?.prospectId ? Number(body.prospectId) : null;
      const soldOutside = Boolean(body?.soldOutside);

      const listing = await db.marketplaceListing.findUnique({
        where: { id: listingId },
        include: {
          prospects: true,
        },
      });
      if (
        !listing ||
        (listing.memberId !== member.id && member.role !== "admin")
      ) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 }
        );
      }

      await db.marketplaceListing.update({
        where: { id: listingId },
        data: {
          status: "sold",
          soldAt: new Date(),
          soldProspectId: prospectId || null,
        },
      });

      if (prospectId && !soldOutside) {
        const winningProspect = listing.prospects.find(
          (p) => p.id === prospectId
        );
        await db.marketplaceProspect.update({
          where: { id: prospectId },
          data: { status: "converted" },
        });

        const matchingShare = winningProspect?.shareToken
          ? await db.listingShare.findUnique({
              where: { shareCode: winningProspect.shareToken },
            })
          : winningProspect?.sharerUserId
          ? await db.listingShare.findFirst({
              where: { listingId, sharerId: winningProspect.sharerUserId },
            })
          : null;

        if (matchingShare) {
          const reward = listing.loveGiftAmount
            ? Number(listing.loveGiftAmount)
            : 0;
          await db.listingShare.update({
            where: { id: matchingShare.id },
            data: {
              status: "converted",
              loveGiftEarned: reward,
            },
          });

          if (reward > 0) {
            try {
              await db.$executeRawUnsafe(
                `INSERT INTO love_gift_claims (listing_id, share_id, sharer_id, seller_id, amount, method, status, created_at)
                 VALUES (?, ?, ?, ?, ?, 'gcash', 'pending', NOW())`,
                listing.id,
                matchingShare.id,
                matchingShare.sharerId,
                listing.memberId,
                reward
              );
            } catch {}

            createNotification({
              memberId: matchingShare.sharerId,
              type: "love_gift_earned",
              title: `🎁 You earned a ₱${reward.toLocaleString()} Love Gift!`,
              body: `"${listing.title}" was sold through your shared link! Tap to claim your Love Gift.`,
              link: `/stewardshop/my-shares`,
              actorId: member.id,
            }).catch(() => {});
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Listing marked as Sold!",
      });
    }

    // 5. Listing Actions: reactivate, delete, update
    if (action === "listing_action") {
      const listingId = Number(body?.listingId);
      const subAction = String(body?.subAction || "");
      const listing = await db.marketplaceListing.findUnique({
        where: { id: listingId },
      });
      if (
        !listing ||
        (listing.memberId !== member.id && member.role !== "admin")
      ) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 }
        );
      }

      if (subAction === "delete") {
        await db.marketplaceListing.update({
          where: { id: listingId },
          data: { status: "removed" },
        });
        return NextResponse.json({
          success: true,
          message: "Listing removed.",
        });
      }

      if (subAction === "reactivate") {
        await db.marketplaceListing.update({
          where: { id: listingId },
          data: { status: "active", soldAt: null, soldProspectId: null },
        });
        return NextResponse.json({
          success: true,
          message: "Listing reactivated!",
        });
      }

      if (subAction === "update") {
        const title = String(body?.title || listing.title).trim();
        const description =
          body?.description !== undefined
            ? String(body.description).trim()
            : listing.description;
        const listingType = [
          "sale",
          "service",
          "rent",
          "trade",
          "free",
          "official_store",
        ].includes(body?.listingType)
          ? body.listingType
          : listing.listingType;
        const category = String(
          body?.category || listing.category || "General"
        ).trim();
        const ogPrice =
          body?.ogPrice !== undefined
            ? body.ogPrice
              ? Number(body.ogPrice)
              : null
            : listing.ogPrice;
        const discountedPrice =
          body?.discountedPrice !== undefined
            ? body.discountedPrice
              ? Number(body.discountedPrice)
              : null
            : listing.discountedPrice;
        const priceLabel =
          body?.priceLabel !== undefined
            ? String(body.priceLabel || "").trim() || null
            : listing.priceLabel;
        const rawCond =
          body?.conditionType !== undefined
            ? String(body.conditionType || "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "_")
            : listing.conditionType;
        const conditionType = ["new", "like_new", "good", "fair"].includes(
          String(rawCond)
        )
          ? (rawCond as any)
          : null;
        const locationArea = String(
          body?.locationArea || listing.locationArea || "General Santos City"
        ).trim();
        const loveGiftAmount =
          body?.loveGiftAmount !== undefined
            ? Math.max(0, Number(body.loveGiftAmount) || 0)
            : listing.loveGiftAmount;

        await db.marketplaceListing.update({
          where: { id: listingId },
          data: {
            title,
            description: description || null,
            listingType,
            category,
            ogPrice:
              ogPrice && !isNaN(Number(ogPrice)) ? Number(ogPrice) : null,
            price: ogPrice && !isNaN(Number(ogPrice)) ? Number(ogPrice) : null,
            discountedPrice:
              discountedPrice && !isNaN(Number(discountedPrice))
                ? Number(discountedPrice)
                : null,
            priceLabel,
            conditionType,
            locationArea,
            loveGiftAmount,
          },
        });

        if (Array.isArray(body?.photoPaths)) {
          await db.marketplaceListingPhoto.deleteMany({ where: { listingId } });
          const cleanPaths = body.photoPaths
            .map((p: string) =>
              String(p).replace(/^https?:\/\/[^/]+\/uploads\/marketplace\//, "")
            )
            .filter(Boolean);
          for (let i = 0; i < cleanPaths.length; i++) {
            await db.marketplaceListingPhoto.create({
              data: { listingId, photoPath: cleanPaths[i], sortOrder: i },
            });
          }
        }

        return NextResponse.json({
          success: true,
          message: "Listing updated!",
        });
      }
    }

    // 6. Update Prospect Status
    if (action === "update_prospect_status") {
      const prospectId = Number(body?.prospectId);
      const status = String(body?.status || "contacted");
      await db.marketplaceProspect.update({
        where: { id: prospectId },
        data: { status: status as any },
      });
      return NextResponse.json({
        success: true,
        message: "Prospect status updated.",
      });
    }

    // 7. Sharer: Request / Claim Love Gift (GCash or Contact Seller)
    if (action === "claim_love_gift") {
      const shareId = Number(body?.shareId);
      const method = body?.method === "contact" ? "contact" : "gcash";
      const gcashName = String(body?.gcashName || "").trim() || null;
      const gcashMobile = String(body?.gcashMobile || "").trim() || null;

      const share = await db.listingShare.findUnique({
        where: { id: shareId },
        include: { listing: true },
      });
      if (!share || share.sharerId !== member.id) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 }
        );
      }

      const amount =
        share.loveGiftEarned && Number(share.loveGiftEarned) > 0
          ? Number(share.loveGiftEarned)
          : share.listing.loveGiftAmount
          ? Number(share.listing.loveGiftAmount)
          : 0;

      const existingClaims = (await db.$queryRawUnsafe(
        `SELECT id FROM love_gift_claims WHERE share_id = ? LIMIT 1`,
        shareId
      )) as any[];

      if (existingClaims.length > 0) {
        await db.$executeRawUnsafe(
          `UPDATE love_gift_claims SET method = ?, gcash_name = ?, gcash_mobile = ? WHERE id = ?`,
          method,
          gcashName,
          gcashMobile,
          existingClaims[0].id
        );
      } else {
        await db.$executeRawUnsafe(
          `INSERT INTO love_gift_claims (listing_id, share_id, sharer_id, seller_id, amount, method, gcash_name, gcash_mobile, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
          share.listingId,
          share.id,
          member.id,
          share.listing.memberId,
          amount,
          method,
          gcashName,
          gcashMobile
        );
      }

      createNotification({
        memberId: share.listing.memberId,
        type: "love_gift_claim",
        title: `🎁 ${member.firstName} ${member.lastName} requested their ₱${amount.toLocaleString()} Love Gift`,
        body:
          method === "gcash"
            ? `GCash: ${gcashName} (${gcashMobile}) for "${share.listing.title}"`
            : `${member.firstName} will contact you directly for "${share.listing.title}"`,
        link: `/stewardshop/my-listings/${share.listingId}/prospects`,
        actorId: member.id,
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "Love Gift request sent to the seller!",
      });
    }

    // 8. Seller: Mark Love Gift as Paid
    if (action === "pay_love_gift") {
      const claimId = Number(body?.claimId);
      const rows = (await db.$queryRawUnsafe(
        `SELECT c.*, l.title as listingTitle FROM love_gift_claims c
         LEFT JOIN marketplace_listings l ON l.id = c.listing_id
         WHERE c.id = ? LIMIT 1`,
        claimId
      )) as any[];
      const claim = rows[0];
      if (
        !claim ||
        (Number(claim.seller_id) !== member.id && member.role !== "admin")
      ) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 }
        );
      }

      await db.$executeRawUnsafe(
        `UPDATE love_gift_claims SET status = 'paid', paid_at = NOW() WHERE id = ?`,
        claimId
      );

      createNotification({
        memberId: Number(claim.sharer_id),
        type: "love_gift_paid",
        title: `💸 ${member.firstName} sent your ₱${Number(claim.amount).toLocaleString()} Love Gift!`,
        body: `Please confirm receipt for "${claim.listingTitle || "StewardShop listing"}".`,
        link: `/stewardshop/my-shares`,
        actorId: member.id,
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "Marked as paid! The sharer has been notified.",
      });
    }

    // 9. Sharer: Confirm Receipt of Love Gift
    if (action === "confirm_receipt") {
      const claimId = Number(body?.claimId);
      const thankYou = String(body?.thankYou || "").trim() || null;

      const rows = (await db.$queryRawUnsafe(
        `SELECT c.*, l.title as listingTitle FROM love_gift_claims c
         LEFT JOIN marketplace_listings l ON l.id = c.listing_id
         WHERE c.id = ? LIMIT 1`,
        claimId
      )) as any[];
      const claim = rows[0];
      if (!claim || Number(claim.sharer_id) !== member.id) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 }
        );
      }

      await db.$executeRawUnsafe(
        `UPDATE love_gift_claims SET status = 'received', received_at = NOW(), thank_you_note = ? WHERE id = ?`,
        thankYou,
        claimId
      );

      createNotification({
        memberId: Number(claim.seller_id),
        type: "love_gift_received",
        title: `✅ ${member.firstName} confirmed receiving your ₱${Number(claim.amount).toLocaleString()} Love Gift!`,
        body: thankYou
          ? `"${thankYou}"`
          : `Thank you for blessing our community through StewardShop!`,
        link: `/stewardshop/my-listings/${claim.listing_id}/prospects`,
        actorId: member.id,
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "Love Gift receipt confirmed! Praise God!",
      });
    }

    // 10. Default: Create Listing
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();
    const listingType = [
      "sale",
      "service",
      "rent",
      "trade",
      "free",
      "official_store",
    ].includes(body?.listingType)
      ? body.listingType
      : "sale";
    const category = String(body?.category || "General").trim();
    const ogPrice =
      body?.ogPrice !== undefined &&
      body?.ogPrice !== null &&
      body?.ogPrice !== ""
        ? Number(body.ogPrice)
        : body?.price !== undefined &&
          body?.price !== null &&
          body?.price !== ""
        ? Number(body.price)
        : null;
    const discountedPrice =
      body?.discountedPrice !== undefined &&
      body?.discountedPrice !== null &&
      body?.discountedPrice !== ""
        ? Number(body.discountedPrice)
        : null;
    const priceLabel = String(body?.priceLabel || "").trim() || null;
    const rawCond = String(body?.conditionType || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    const conditionType = ["new", "like_new", "good", "fair"].includes(rawCond)
      ? (rawCond as any)
      : null;
    const loveGiftAmount = body?.loveGiftAmount
      ? Math.max(0, Number(body.loveGiftAmount))
      : 0;
    const locationArea = String(
      body?.locationArea || "General Santos City"
    ).trim();
    const videoUrl = String(body?.videoUrl || "").trim() || null;
    const photoPaths: string[] = Array.isArray(body?.photoPaths)
      ? body.photoPaths
      : [];

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Please provide a listing title." },
        { status: 400 }
      );
    }

    const created = await db.marketplaceListing.create({
      data: {
        memberId: member.id,
        title,
        description: description || null,
        listingType,
        category,
        ogPrice: ogPrice !== null && !isNaN(ogPrice) ? ogPrice : null,
        price: ogPrice !== null && !isNaN(ogPrice) ? ogPrice : null,
        discountedPrice:
          discountedPrice !== null && !isNaN(discountedPrice)
            ? discountedPrice
            : null,
        priceLabel,
        conditionType,
        loveGiftAmount,
        locationArea,
        isPrivate: false,
        status: "active",
      },
    });

    if (photoPaths.length > 0) {
      const cleanPaths = photoPaths
        .map((p) =>
          String(p).replace(/^https?:\/\/[^/]+\/uploads\/marketplace\//, "")
        )
        .filter(Boolean)
        .slice(0, 5);
      for (let i = 0; i < cleanPaths.length; i++) {
        await db.marketplaceListingPhoto.create({
          data: {
            listingId: created.id,
            photoPath: cleanPaths[i],
            sortOrder: i,
          },
        });
      }
    }

    notifyAllMembers({
      actorId: member.id,
      type: "new_marketplace",
      title: `New on StewardShop: ${title}`,
      body: `${member.firstName} ${member.lastName} listed "${title}" in StewardShop.`,
      link: `/stewardshop/${created.id}`,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: { listingId: created.id, isPrivate: false, moderationReason: null },
      message: "Your listing is now live on StewardShop!",
    });
  } catch (err: any) {
    console.error("[api/mobile/stewardshop POST]", err?.message);
    return NextResponse.json(
      { success: false, message: "Failed to process StewardShop request" },
      { status: 500 }
    );
  }
}
