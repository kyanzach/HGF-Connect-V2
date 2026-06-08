import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Collection of encouraging scripture verses for birthdays
const BIRTHDAY_VERSES = [
  { ref: "Psalm 139:13-14", text: "For you created my inmost being; you knit me together in my mother's womb. I praise you because I am fearfully and wonderfully made." },
  { ref: "Numbers 6:24-26", text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace." },
  { ref: "Ephesians 2:10", text: "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do." },
  { ref: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future." },
  { ref: "Psalm 20:4", text: "May he give you the desire of your heart and make all your plans succeed." },
  { ref: "Psalm 37:4", text: "Take delight in the Lord, and he will give you the desires of your heart." },
  { ref: "3 John 1:2", text: "Dear friend, I pray that you may enjoy good health and that all may go well with you, even as your soul is getting along well." },
  { ref: "Proverbs 9:11", text: "For through wisdom your days will be many, and years will be added to your life." }
];

export async function POST(request: Request) {
  // ── Auth: Cron secret ──
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Current date in Manila Time
    const now = new Date();
    const manilaStr = now.toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const manilaDate = new Date(manilaStr);
    const currentMonth = manilaDate.getMonth() + 1; // 1-12
    const currentDay = manilaDate.getDate(); // 1-31

    // Fetch all active members with a birthday
    const activeMembers = await db.member.findMany({
      where: { status: "active" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        birthdate: true,
      }
    });

    // ── 1. Find the system author (first administrator) ──
    const admin = await db.member.findFirst({
      where: { role: "admin" },
      orderBy: { id: "asc" },
      select: { id: true }
    });
    const authorId = admin ? admin.id : 1;

    const reports: string[] = [];

    // ── 2. Run Monthly Announcement (First day of month) ──
    if (currentDay === 1) {
      const monthlyCelebrants = activeMembers.filter((m) => {
        if (!m.birthdate) return false;
        const birth = new Date(m.birthdate);
        const mMonth = birth.getUTCMonth() + 1;
        return mMonth === currentMonth;
      }).map((m) => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        profilePicture: m.profilePicture,
      }));

      if (monthlyCelebrants.length > 0) {
        // Prevent duplicate monthly posts
        const startOfDay = new Date(manilaDate);
        startOfDay.setHours(0, 0, 0, 0);
        const startOfDayUTC = new Date(startOfDay.getTime() - 8 * 60 * 60 * 1000);

        const existingMonthly = await db.post.findFirst({
          where: {
            type: "BIRTHDAY_MONTHLY",
            createdAt: { gte: startOfDayUTC },
          }
        });

        if (!existingMonthly) {
          const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
          ];
          const monthName = monthNames[currentMonth - 1];

          const payload = {
            month: monthName,
            celebrants: monthlyCelebrants,
          };

          await db.post.create({
            data: {
              authorId,
              type: "BIRTHDAY_MONTHLY",
              content: JSON.stringify(payload),
              visibility: "MEMBERS_ONLY",
            }
          });
          reports.push(`Monthly birthday post published for ${monthName} (${monthlyCelebrants.length} celebrants)`);
        }
      }
    }

    // ── 3. Run Daily Announcement ──
    const dailyCelebrants = activeMembers.filter((m) => {
      if (!m.birthdate) return false;
      const birth = new Date(m.birthdate);
      const mMonth = birth.getUTCMonth() + 1;
      const mDay = birth.getUTCDate();
      return mMonth === currentMonth && mDay === currentDay;
    });

    for (const celebrant of dailyCelebrants) {
      // Prevent duplicate daily posts for this member today
      const startOfDay = new Date(manilaDate);
      startOfDay.setHours(0, 0, 0, 0);
      const startOfDayUTC = new Date(startOfDay.getTime() - 8 * 60 * 60 * 1000);

      const existingDaily = await db.post.findFirst({
        where: {
          type: "BIRTHDAY_DAILY",
          createdAt: { gte: startOfDayUTC },
          content: { contains: `"memberId":${celebrant.id}` }
        }
      });

      if (!existingDaily) {
        // Pick a deterministic verse based on the celebrant's ID
        const verse = BIRTHDAY_VERSES[celebrant.id % BIRTHDAY_VERSES.length];

        const message = `🎉 Happy Birthday to our beloved brother/sister in Christ, ${celebrant.firstName} ${celebrant.lastName}! 🎂🎈\n\nOn this special day, we praise God for the gift of your life and the unique blessing you are to our church community. May the Lord guide your steps, keep you in His perfect peace, and shower you with His abundant grace in this new year of your life.\n\nWe celebrate you today on behalf of your family here at House of Grace Fellowship! ❤️`;

        const payload = {
          memberId: celebrant.id,
          name: `${celebrant.firstName} ${celebrant.lastName}`,
          profilePicture: celebrant.profilePicture,
          message,
          verseRef: verse.ref,
          verseText: verse.text,
        };

        await db.post.create({
          data: {
            authorId,
            type: "BIRTHDAY_DAILY",
            content: JSON.stringify(payload),
            visibility: "MEMBERS_ONLY",
          }
        });
        reports.push(`Daily birthday post published for ${celebrant.firstName} ${celebrant.lastName}`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: manilaDate.toISOString(),
      reports,
    });
  } catch (error: any) {
    console.error("[api/birthdays/check]", error?.message);
    return NextResponse.json({ error: "Failed to run birthday announcements" }, { status: 500 });
  }
}
