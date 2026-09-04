import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { BIBLE_VERSES as DEFAULT_REMINDER_VERSES } from "@/lib/smsTemplates";

export const dynamic = "force-dynamic";

export const DEFAULT_BIRTHDAY_VERSES = [
  { ref: "Psalm 139:13-14", text: "For you created my inmost being; you knit me together in my mother's womb. I praise you because I am fearfully and wonderfully made." },
  { ref: "Numbers 6:24-26", text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace." },
  { ref: "Ephesians 2:10", text: "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do." },
  { ref: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future." },
  { ref: "Psalm 20:4", text: "May he give you the desire of your heart and make all your plans succeed." },
  { ref: "Psalm 37:4", text: "Take delight in the Lord, and he will give you the desires of your heart." },
  { ref: "3 John 1:2", text: "Dear friend, I pray that you may enjoy good health and that all may go well with you, even as your soul is getting along well." },
  { ref: "Proverbs 9:11", text: "For through wisdom your days will be many, and years will be added to your life." },
  { ref: "Psalm 118:24", text: "This is the day the LORD has made; let us rejoice and be glad in it." },
  { ref: "Zephaniah 3:17", text: "The LORD your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing." }
];

export const DEFAULT_BIRTHDAY_TEMPLATE = `🎉 Happy Birthday, {firstName}! 🎂 House of Grace Fellowship celebrates you today and thanks God for the gift of your life! "{verseText}" ({verseRef}) God bless you abundantly! ❤️`;

/**
 * GET /api/admin/sms/settings
 * Fetches configured reminder verses, birthday SMS config, and birthday verses from church_settings.
 */
export async function GET() {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await db.churchSetting.findMany({
      where: {
        key: {
          in: ["sms_reminder_verses", "sms_birthday_settings", "sms_birthday_verses"]
        }
      }
    });

    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    let reminderVerses = DEFAULT_REMINDER_VERSES;
    if (settingsMap.sms_reminder_verses) {
      try {
        reminderVerses = JSON.parse(settingsMap.sms_reminder_verses);
      } catch (e) {
        console.error("Failed to parse sms_reminder_verses setting:", e);
      }
    }

    let birthdaySettings = {
      enabled: true,
      template: DEFAULT_BIRTHDAY_TEMPLATE,
    };
    if (settingsMap.sms_birthday_settings) {
      try {
        birthdaySettings = { ...birthdaySettings, ...JSON.parse(settingsMap.sms_birthday_settings) };
      } catch (e) {
        console.error("Failed to parse sms_birthday_settings:", e);
      }
    }

    let birthdayVerses = DEFAULT_BIRTHDAY_VERSES;
    if (settingsMap.sms_birthday_verses) {
      try {
        birthdayVerses = JSON.parse(settingsMap.sms_birthday_verses);
      } catch (e) {
        console.error("Failed to parse sms_birthday_verses:", e);
      }
    }

    return NextResponse.json({
      reminderVerses,
      birthdaySettings,
      birthdayVerses,
      defaults: {
        reminderVerses: DEFAULT_REMINDER_VERSES,
        birthdaySettings: { enabled: true, template: DEFAULT_BIRTHDAY_TEMPLATE },
        birthdayVerses: DEFAULT_BIRTHDAY_VERSES,
      }
    });
  } catch (err: any) {
    console.error("[api/admin/sms/settings GET]", err?.message);
    return NextResponse.json({ error: "Failed to load SMS settings" }, { status: 500 });
  }
}

/**
 * POST /api/admin/sms/settings
 * Saves updated reminder verses, birthday SMS config, and birthday verses.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reminderVerses, birthdaySettings, birthdayVerses } = body;

    if (reminderVerses !== undefined) {
      await db.churchSetting.upsert({
        where: { key: "sms_reminder_verses" },
        update: { value: JSON.stringify(reminderVerses) },
        create: { key: "sms_reminder_verses", value: JSON.stringify(reminderVerses) }
      });
    }

    if (birthdaySettings !== undefined) {
      await db.churchSetting.upsert({
        where: { key: "sms_birthday_settings" },
        update: { value: JSON.stringify(birthdaySettings) },
        create: { key: "sms_birthday_settings", value: JSON.stringify(birthdaySettings) }
      });
    }

    if (birthdayVerses !== undefined) {
      await db.churchSetting.upsert({
        where: { key: "sms_birthday_verses" },
        update: { value: JSON.stringify(birthdayVerses) },
        create: { key: "sms_birthday_verses", value: JSON.stringify(birthdayVerses) }
      });
    }

    // Log the update
    await db.appLog.create({
      data: {
        appSection: "SMS",
        pageTitle: "SMS Command Hub",
        actionType: "sms_settings_updated",
        description: `Updated SMS reminder verses and birthday settings`,
        performedById: parseInt(session.user.id),
        performedByName: `${session.user.name || "Admin"}`,
        performedByRole: session.user.role,
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/admin/sms/settings POST]", err?.message);
    return NextResponse.json({ error: "Failed to save SMS settings" }, { status: 500 });
  }
}
