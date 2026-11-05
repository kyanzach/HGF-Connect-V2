import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const REPORTS_FILE = path.join(process.cwd(), "data", "ugc_moderation_reports.json");

async function readModerationReports(): Promise<any[]> {
  try {
    const raw = await fs.readFile(REPORTS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const [
      approvedCount,
      activeCount,
      pendingCount,
      postsCount,
      prayersCount,
      eventsCount,
      listingsCount,
      recentMembers,
      reports,
    ] = await Promise.all([
      db.member.count({ where: { status: "approved" } }),
      db.member.count({ where: { status: "active" } }),
      db.member.count({ where: { status: "pending" } }),
      db.post.count(),
      db.prayerRequest.count({ where: { isAnswered: false } }),
      db.event.count({ where: { status: "scheduled" } }),
      db.marketplaceListing.count({ where: { status: "active" } }),
      db.member.findMany({
        where: q
          ? {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { username: { contains: q } },
              ],
            }
          : { status: { in: ["pending", "approved", "active"] } },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: 40,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          phone: true,
          status: true,
          role: true,
          type: true,
          lastLogin: true,
          profilePicture: true,
        },
      }),
      readModerationReports(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        viewerRole: member?.role || "user",
        stats: {
          totalApprovedMembers: approvedCount + activeCount,
          autoApprovedCount: approvedCount,
          forceActiveCount: activeCount,
          pendingApprovals: pendingCount,
          totalPosts: postsCount,
          activePrayers: prayersCount,
          upcomingEvents: eventsCount,
          activeListings: listingsCount,
          openReports: reports.filter((r) => r.status !== "resolved").length,
        },
        members: recentMembers.map((m) => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`.trim(),
          username: m.username,
          phone: m.phone,
          status: m.status,
          role: m.role,
          type: m.type,
          lastLogin: m.lastLogin ? m.lastLogin.toISOString() : null,
          avatar: m.profilePicture
            ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${m.profilePicture}`
            : null,
        })),
        reports: reports.slice(0, 30),
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/admin GET]", err?.message);
    return NextResponse.json(
      { success: false, message: "Failed to load admin overview" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member || (member.role !== "admin" && member.role !== "moderator")) {
      return NextResponse.json(
        { success: false, message: "Admin or Moderator access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "update_member_status") {
      const targetId = Number(body?.memberId);
      const nextStatus = ["approved", "active", "pending", "archived"].includes(body?.status)
        ? body.status
        : "approved";

      if (!targetId) {
        return NextResponse.json({ success: false, message: "Invalid member ID" }, { status: 400 });
      }

      await db.member.update({
        where: { id: targetId },
        data: {
          status: nextStatus,
          statusChangedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Member status updated to ${nextStatus === "approved" ? "Auto (Approved)" : nextStatus}.`,
      });
    }

    if (action === "resolve_report") {
      const reportId = String(body?.reportId || "");
      const reports = await readModerationReports();
      const updated = reports.map((r) =>
        String(r.id) === reportId ? { ...r, status: "resolved", resolvedBy: member.id } : r
      );
      await fs.mkdir(path.dirname(REPORTS_FILE), { recursive: true });
      await fs.writeFile(REPORTS_FILE, JSON.stringify(updated, null, 2), "utf8");
      return NextResponse.json({
        success: true,
        message: "Moderation report marked as resolved.",
      });
    }

    return NextResponse.json({ success: false, message: "Unknown admin action" }, { status: 400 });
  } catch (err: any) {
    console.error("[api/mobile/admin POST]", err?.message);
    return NextResponse.json(
      { success: false, message: "Failed to process admin action" },
      { status: 500 }
    );
  }
}
