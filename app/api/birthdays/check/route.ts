import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import { DEFAULT_BIRTHDAY_TEMPLATE, DEFAULT_BIRTHDAY_VERSES } from "@/app/api/admin/sms/settings/route";

export const dynamic = "force-dynamic";

const BIRTHDAY_VERSES = DEFAULT_BIRTHDAY_VERSES;

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

    // Load custom birthday SMS configuration & verses from church_settings
    let birthdaySmsConfig = { enabled: true, template: DEFAULT_BIRTHDAY_TEMPLATE };
    let birthdayVersesPool = BIRTHDAY_VERSES;
    try {
      const settingsList = await db.churchSetting.findMany({
        where: { key: { in: ["sms_birthday_settings", "sms_birthday_verses"] } }
      });
      for (const s of settingsList) {
        if (s.key === "sms_birthday_settings" && s.value) {
          birthdaySmsConfig = { ...birthdaySmsConfig, ...JSON.parse(s.value) };
        }
        if (s.key === "sms_birthday_verses" && s.value) {
          const parsed = JSON.parse(s.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            birthdayVersesPool = parsed;
          }
        }
      }
    } catch (err) {
      console.error("Failed to load birthday SMS settings:", err);
    }

    // Fetch all active members with a birthday
    const activeMembers = await db.member.findMany({
      where: { status: { notIn: ["pending", "archived"] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePicture: true,
        coverPhoto: true,
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

    // ── 2. Run Monthly Announcement (catch-up: checks every day) ──
    // Instead of only firing on day 1, we check every day whether a monthly
    // post exists for the current month. If none exists, we create one.
    // This ensures the monthly post is never missed due to server downtime.
    {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthName = monthNames[currentMonth - 1];

      // Check if a monthly post already exists for this entire month
      const startOfMonth = new Date(manilaDate);
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthUTC = new Date(startOfMonth.getTime() - 8 * 60 * 60 * 1000);

      const existingMonthly = await db.post.findFirst({
        where: {
          type: "BIRTHDAY_MONTHLY",
          content: { contains: `"month":"${monthName}"` },
          createdAt: { gte: startOfMonthUTC },
        }
      });

      if (!existingMonthly) {
        const monthlyCelebrants = activeMembers.filter((m) => {
          if (!m.birthdate) return false;
          const birth = new Date(m.birthdate);
          const mMonth = birth.getUTCMonth() + 1;
          return mMonth === currentMonth;
        }).map((m) => {
          let imagePath = null;
          if (m.profilePicture) {
            imagePath = `/uploads/profile_pictures/${m.profilePicture}`;
          } else if (m.coverPhoto) {
            imagePath = `/uploads/cover_photos/${m.coverPhoto}`;
          }

          const birthDateObj = new Date(m.birthdate!);
          const day = birthDateObj.getUTCDate();

          return {
            id: m.id,
            name: `${m.firstName} ${m.lastName}`,
            profilePicture: imagePath,
            birthDay: day,
          };
        });

        if (monthlyCelebrants.length > 0) {
          // Sort chronologically by birthDay
          monthlyCelebrants.sort((a, b) => (a.birthDay || 0) - (b.birthDay || 0));

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
        // Pick a deterministic verse from the active birthday verse pool
        const verse = birthdayVersesPool[celebrant.id % birthdayVersesPool.length];

        const message = `🎉 Wishing a very Happy and Blessed Birthday to our dear ${celebrant.firstName}! 🎂🎈\n\nOn this special day, we praise God for the gift of your life and the unique blessing you are to our church family. May the Lord guide your steps, keep you in His perfect peace, and shower you with His abundant grace in this new year of your life!\n\nWe celebrate you today on behalf of your family here at House of Grace Fellowship! ❤️`;

        let imagePath = null;
        if (celebrant.profilePicture) {
          imagePath = `/uploads/profile_pictures/${celebrant.profilePicture}`;
        } else if (celebrant.coverPhoto) {
          imagePath = `/uploads/cover_photos/${celebrant.coverPhoto}`;
        }

        const payload = {
          memberId: celebrant.id,
          name: `${celebrant.firstName} ${celebrant.lastName}`,
          profilePicture: imagePath,
          message,
          verseRef: verse.ref,
          verseText: verse.text,
          birthMonth: celebrant.birthdate ? new Date(celebrant.birthdate).getUTCMonth() + 1 : null,
          birthDay: celebrant.birthdate ? new Date(celebrant.birthdate).getUTCDate() : null,
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

        // ── 3. Dispatch Birthday SMS if enabled ──
        if (birthdaySmsConfig.enabled && celebrant.phone) {
          const isTestingPhone = celebrant.phone === "09000000000" || celebrant.firstName.toUpperCase().startsWith("HGF");
          if (!isTestingPhone) {
            try {
              // Prevent duplicate birthday SMS today
              const existingSms = await db.smsLog.findFirst({
                where: {
                  memberId: celebrant.id,
                  sentAt: { gte: startOfDayUTC },
                  message: { contains: "Birthday" }
                }
              });

              if (!existingSms) {
                let smsMessage = birthdaySmsConfig.template || DEFAULT_BIRTHDAY_TEMPLATE;
                smsMessage = smsMessage
                  .replace(/{firstName}/g, celebrant.firstName)
                  .replace(/{lastName}/g, celebrant.lastName)
                  .replace(/{verseText}/g, verse.text)
                  .replace(/{verseRef}/g, verse.ref);

                const smsRes = await sendSms(celebrant.phone, smsMessage, celebrant.id);
                if (smsRes.success) {
                  reports.push(`Birthday SMS delivered to ${celebrant.firstName} (${celebrant.phone})`);
                } else {
                  reports.push(`Birthday SMS failed for ${celebrant.firstName}: ${smsRes.error}`);
                }
              }
            } catch (smsErr: any) {
              console.error(`Birthday SMS dispatch error for member #${celebrant.id}:`, smsErr?.message);
            }
          }
        }
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
