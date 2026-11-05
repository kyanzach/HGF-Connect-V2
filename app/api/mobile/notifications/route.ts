import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return NextResponse.json({
        success: true,
        data: { notifications: [], unread_count: 0 },
      });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 50);

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { memberId: member.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.notification.count({
        where: { memberId: member.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        unread_count: unreadCount,
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.body,
          link: n.link || "/(tabs)",
          is_read: n.isRead,
          created_at: n.createdAt.toISOString(),
        })),
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/notifications GET]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to load notifications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await db.notification.updateMany({
      where: { memberId: member.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/mobile/notifications POST]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to mark notifications read" }, { status: 500 });
  }
}
