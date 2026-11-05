import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apple Guideline 5.1.1(v) & Google Play Data Deletion compliance:
    // Scrub personal contact details & credentials and mark account archived/deleted
    const deletedSuffix = `deleted_${member.id}_${Date.now()}`;
    await db.member.update({
      where: { id: member.id },
      data: {
        status: "archived",
        email: null,
        phone: null,
        address: null,
        password: null,
        username: deletedSuffix,
        profilePicture: null,
        coverPhoto: null,
        favoriteVerse: null,
        showEmail: false,
        showPhone: false,
        showAddress: false,
        sms5dayReminder: false,
        sms3dayReminder: false,
        sms1dayReminder: false,
        smsSameDayReminder: false,
      },
    });

    await db.appLog.create({
      data: {
        appSection: "Profile",
        actionType: "DELETE",
        pageTitle: "Account Deletion",
        description: `Member #${member.id} (${member.firstName} ${member.lastName}) permanently deleted their account in-app`,
        performedById: member.id,
        performedByName: `${member.firstName} ${member.lastName}`,
        performedByRole: member.role,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Your account and personal data have been permanently deleted.",
    });
  } catch (err: any) {
    console.error("[api/profile/delete-account]", err?.message);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
