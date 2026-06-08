import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, memberId } = body;

    // Get system author (first administrator)
    const admin = await db.member.findFirst({
      where: { role: "admin" },
      orderBy: { id: "asc" },
      select: { id: true }
    });
    const authorId = admin ? admin.id : 1;

    if (type === "monthly") {
      const now = new Date();
      const manilaStr = now.toLocaleString("en-US", { timeZone: "Asia/Manila" });
      const manilaDate = new Date(manilaStr);
      const currentMonth = manilaDate.getMonth() + 1; // 1-12
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthName = monthNames[currentMonth - 1];

      // Fetch active members
      const activeMembers = await db.member.findMany({
        where: { status: "active" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          coverPhoto: true,
          birthdate: true,
        }
      });

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

      if (monthlyCelebrants.length === 0) {
        return NextResponse.json({ error: `No active members celebrate birthdays in ${monthName}.` }, { status: 400 });
      }

      // Sort chronologically by birthDay
      monthlyCelebrants.sort((a, b) => (a.birthDay || 0) - (b.birthDay || 0));

      const payload = {
        month: monthName,
        celebrants: monthlyCelebrants,
      };

      const post = await db.post.create({
        data: {
          authorId,
          type: "BIRTHDAY_MONTHLY",
          content: JSON.stringify(payload),
          visibility: "MEMBERS_ONLY",
        }
      });

      // Log the admin action
      await db.appLog.create({
        data: {
          appSection: "Admin",
          actionType: "CREATE",
          pageTitle: "Birthdays Admin",
          description: `Published demo monthly birthday post for ${monthName}`,
          performedById: Number(session.user.id),
          performedByName: `${(session.user as any).firstName} ${(session.user as any).lastName}`,
          performedByRole: session.user.role,
        }
      });

      return NextResponse.json({ success: true, postId: post.id });

    } else if (type === "daily") {
      if (!memberId) {
        return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
      }

      const member = await db.member.findUnique({
        where: { id: Number(memberId) },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          coverPhoto: true,
          birthdate: true,
          status: true,
        }
      });

      if (!member || member.status !== "active") {
        return NextResponse.json({ error: "Active member not found" }, { status: 404 });
      }

      // Pick a deterministic verse based on the celebrant's ID
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

      const verse = BIRTHDAY_VERSES[member.id % BIRTHDAY_VERSES.length];

      const message = `🎉 Wishing a very Happy and Blessed Birthday to our dear ${member.firstName}! 🎂🎈\n\nOn this special day, we praise God for the gift of your life and the unique blessing you are to our church family. May the Lord guide your steps, keep you in His perfect peace, and shower you with His abundant grace in this new year of your life!\n\nWe celebrate you today on behalf of your family here at House of Grace Fellowship! ❤️`;

      let imagePath = null;
      if (member.profilePicture) {
        imagePath = `/uploads/profile_pictures/${member.profilePicture}`;
      } else if (member.coverPhoto) {
        imagePath = `/uploads/cover_photos/${member.coverPhoto}`;
      }

      const payload = {
        memberId: member.id,
        name: `${member.firstName} ${member.lastName}`,
        profilePicture: imagePath,
        message,
        verseRef: verse.ref,
        verseText: verse.text,
        birthMonth: member.birthdate ? new Date(member.birthdate).getUTCMonth() + 1 : null,
        birthDay: member.birthdate ? new Date(member.birthdate).getUTCDate() : null,
      };

      const post = await db.post.create({
        data: {
          authorId,
          type: "BIRTHDAY_DAILY",
          content: JSON.stringify(payload),
          visibility: "MEMBERS_ONLY",
        }
      });

      // Log the admin action
      await db.appLog.create({
        data: {
          appSection: "Admin",
          actionType: "CREATE",
          pageTitle: "Birthdays Admin",
          description: `Published demo daily birthday post for ${member.firstName} ${member.lastName}`,
          performedById: Number(session.user.id),
          performedByName: `${(session.user as any).firstName} ${(session.user as any).lastName}`,
          performedByRole: session.user.role,
        }
      });

      return NextResponse.json({ success: true, postId: post.id });
    } else {
      return NextResponse.json({ error: "Invalid demo post type" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[api/admin/birthdays/demo]", error?.message);
    return NextResponse.json({ error: "Failed to publish demo birthday post" }, { status: 500 });
  }
}
