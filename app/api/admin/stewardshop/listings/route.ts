import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [listings, total, active, privateCount, verifiedSellers] = await Promise.all([
      db.marketplaceListing.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          seller: {
            select: { id: true, firstName: true, lastName: true, isVerified: true },
          },
        },
      }),
      db.marketplaceListing.count(),
      db.marketplaceListing.count({ where: { status: "active", isPrivate: false } }),
      db.marketplaceListing.count({ where: { isPrivate: true } }),
      db.member.count({ where: { isVerified: true } }),
    ]);

    return NextResponse.json({
      listings,
      stats: { total, active, privateCount, verifiedSellers },
    });
  } catch (error: any) {
    console.error("[api/admin/stewardshop/listings/GET]", error?.message);
    return NextResponse.json({ error: "Failed to load listings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { listingId, isPrivate, moderationReason, sellerId, isVerified } = body;

    // Toggle seller verification status directly
    if (sellerId !== undefined && isVerified !== undefined) {
      await db.member.update({
        where: { id: Number(sellerId) },
        data: { isVerified: Boolean(isVerified) },
      });

      await db.appLog.create({
        data: {
          appSection: "admin",
          pageTitle: "StewardShop Moderation",
          actionType: "seller_verification_toggled",
          description: `${isVerified ? "Granted" : "Removed"} seller verification badge for member ID ${sellerId}`,
          performedById: parseInt(session.user.id),
          performedByName: `${session.user.firstName ?? ""} ${session.user.lastName ?? ""}`.trim(),
          performedByRole: (session.user.role ?? "admin") as any,
          targetType: "member",
          targetName: `Member ID ${sellerId}`,
        },
      });

      return NextResponse.json({ success: true });
    }

    // Toggle listing privacy / set moderation explanation
    if (listingId !== undefined && isPrivate !== undefined) {
      await db.marketplaceListing.update({
        where: { id: Number(listingId) },
        data: {
          isPrivate: Boolean(isPrivate),
          moderationReason: moderationReason || null,
        },
      });

      await db.appLog.create({
        data: {
          appSection: "admin",
          pageTitle: "StewardShop Moderation",
          actionType: "listing_moderated",
          description: `Set listing ID ${listingId} visibility to ${isPrivate ? "Private" : "Public"}. Reason: ${moderationReason || "None"}`,
          performedById: parseInt(session.user.id),
          performedByName: `${session.user.firstName ?? ""} ${session.user.lastName ?? ""}`.trim(),
          performedByRole: (session.user.role ?? "admin") as any,
          targetType: "listing",
          targetName: `Listing ID ${listingId}`,
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid parameters." }, { status: 400 });
  } catch (error: any) {
    console.error("[api/admin/stewardshop/listings/PATCH]", error?.message);
    return NextResponse.json({ error: "Failed to update listing: " + error.message }, { status: 500 });
  }
}
