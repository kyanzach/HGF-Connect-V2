import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/notifications — returns unread notifications for current user
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = parseInt(session.user.id);

  try {
    const notifications = await db.notification.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
    });
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error("[notifications GET]", (err as Error).message);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

// PATCH /api/notifications        — mark ALL as read
// PATCH /api/notifications?id=X   — mark ONE notification as read
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = parseInt(session.user.id);
  const { searchParams } = new URL(req.url);
  const singleId = searchParams.get("id") ? parseInt(searchParams.get("id")!) : null;

  try {
    if (singleId) {
      // Mark single notification read (must belong to this user)
      await db.notification.updateMany({
        where: { id: singleId, memberId, isRead: false },
        data: { isRead: true },
      });
    } else {
      // Bulk: mark all read
      await db.notification.updateMany({
        where: { memberId, isRead: false },
        data: { isRead: true },
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[notifications PATCH]", (err as Error).message);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
