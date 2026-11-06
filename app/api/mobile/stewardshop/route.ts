import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { createNotification, notifyAllMembers } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "all";

    const where: any = {};
    if (category === "mine" && member) {
      where.memberId = member.id;
      where.status = { in: ["active", "sold", "reserved"] };
    } else {
      where.status = "active";
      if (category && category !== "all") {
        where.listingType = category;
      }
    }

    const listings = await db.marketplaceListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            profilePicture: true,
            isVerified: true,
          },
        },
        photos: {
          orderBy: { sortOrder: "asc" },
          take: 4,
        },
        _count: {
          select: { prospects: true, messages: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        listings: listings.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description || "",
          listingType: l.listingType,
          status: l.status,
          category: l.category || "General",
          price: l.price ? Number(l.price) : null,
          discountedPrice: l.discountedPrice ? Number(l.discountedPrice) : null,
          priceLabel: l.priceLabel || null,
          conditionType: l.conditionType || null,
          locationArea: l.locationArea || "General Santos City",
          loveGiftAmount: l.loveGiftAmount || 0,
          prospectCount: l._count.prospects,
          messageCount: l._count.messages,
          createdAt: l.createdAt.toISOString(),
          seller: {
            id: l.seller.id,
            name: `${l.seller.firstName} ${l.seller.lastName}`.trim(),
            phone: l.seller.phone || null,
            isVerified: l.seller.isVerified,
            avatar: l.seller.profilePicture
              ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${l.seller.profilePicture}`
              : null,
          },
          photos: l.photos.map((p) =>
            p.photoPath.startsWith("http")
              ? p.photoPath
              : `https://connect.houseofgrace.ph/uploads/marketplace/${p.photoPath}`
          ),
        })),
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

    if (action === "inquire") {
      const listingId = Number(body?.listingId);
      const messageText = String(body?.message || "Hi! I am interested in your StewardShop listing.").trim();

      const listing = await db.marketplaceListing.findUnique({
        where: { id: listingId },
        select: { id: true, title: true, memberId: true },
      });
      if (!listing) {
        return NextResponse.json({ success: false, message: "Listing not found" }, { status: 404 });
      }

      await db.marketplaceProspect.create({
        data: {
          listingId: listing.id,
          prospectName: `${member.firstName} ${member.lastName}`.trim(),
          prospectMobile: member.phone || null,
          prospectEmail: member.email || null,
          actionType: "contact",
          status: "contacted",
          consented: true,
        },
      });

      if (listing.memberId !== member.id) {
        await db.marketplaceMessage.create({
          data: {
            listingId: listing.id,
            senderId: member.id,
            receiverId: listing.memberId,
            message: messageText,
          },
        });

        createNotification({
          memberId: listing.memberId,
          type: "marketplace_prospect",
          title: `${member.firstName} ${member.lastName} inquired on "${listing.title}"`,
          body: messageText.slice(0, 120),
          link: `/stewardshop/${listing.id}`,
          actorId: member.id,
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: "Your inquiry was sent to the seller!",
      });
    }

    if (action === "mark_sold") {
      const listingId = Number(body?.listingId);
      const listing = await db.marketplaceListing.findUnique({
        where: { id: listingId },
        select: { id: true, memberId: true },
      });
      if (!listing || (listing.memberId !== member.id && member.role !== "admin")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }

      await db.marketplaceListing.update({
        where: { id: listingId },
        data: { status: "sold", soldAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: "Listing marked as Sold!",
      });
    }

    // Default: create_listing
    const title = String(body?.title || "").trim();
    const description = String(body?.description || "").trim();
    const listingType = ["sale", "service", "rent", "trade", "free"].includes(body?.listingType)
      ? body.listingType
      : "sale";
    const category = String(body?.category || "General").trim();
    const price = body?.price ? Number(body.price) : null;
    const loveGiftAmount = body?.loveGiftAmount ? Math.max(0, Number(body.loveGiftAmount)) : 0;
    const locationArea = String(body?.locationArea || "General Santos City").trim();

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
        price: price && !isNaN(price) ? price : null,
        loveGiftAmount,
        locationArea,
        status: "active",
      },
    });

    notifyAllMembers({
      actorId: member.id,
      type: "new_marketplace",
      title: `New on StewardShop: ${title}`,
      body: `${member.firstName} ${member.lastName} listed "${title}" in StewardShop.`,
      link: `/stewardshop/${created.id}`,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: { listingId: created.id },
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
