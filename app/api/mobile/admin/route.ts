import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { notifyAllMembers, createNotification } from "@/lib/notify";
import { sendSms } from "@/lib/sms";
import {
  generateQuiz,
  getRewardTier,
  isQuizWeekExpired,
  getQuizDayForDate,
  QUIZ_DAYS,
  QUIZ_TYPE_LABELS,
} from "@/lib/quiz-helpers";
import { extractVideoId, fetchTranscriptWithMeta } from "@/lib/youtube";
import { QuizRewardTier } from "@prisma/client";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const SETTINGS_DEFAULTS: Record<string, string> = {
  church_name: "House of Grace Fellowship",
  church_address: "11-A Iñigo St., Obrero, Davao City",
  sunday_services:
    "Sunday Schedule:\nService 1: 9:00 AM\nService 2: 11:00 AM\nBoth are held at the main HGF venue. Worship begins 15 minutes before the service start time.",
  midweek_services: "Wednesday prayer meeting at 7:00 PM. Open to all members and visitors.",
  prayer_schedules: "Wednesday Midweek Prayer meeting: 7:00 PM\nSaturday Morning Dawn Prayer: 6:00 AM",
  cell_groups:
    "Cell groups are small gatherings of 8-15 members that meet weekly for Bible study, prayer, and fellowship. They are the backbone of the HGF community.",
  volunteering:
    "To volunteer, attend our monthly ministry orientation. Express interest to the ministry leader or at the church office. Active ministries include: Worship Team, KIDS Church, Youth Ministry, Media, Ushering, Prayer, Cell Group, and Outreach.",
  worship_team:
    "Our HGF Worship Team leads praise and worship during services. Rehearsals are held weekly on Saturdays. Auditions and orientations are conducted periodically.",
  prayer_support:
    "You can submit prayer requests directly on the Prayer Wall inside the app, or message our ministry leaders for support.",
  latest_announcements:
    "Keep an eye on the community feed and the events section in the HGF Connect app for the latest updates.",
};

export async function GET(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "dashboard";

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentYear = Number(searchParams.get("year") || now.getFullYear());
    const currentMonth = Number(searchParams.get("month") || now.getMonth() + 1) - 1;
    const trendMode = searchParams.get("mode") || "month";

    const startOfRange =
      trendMode === "year"
        ? new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0))
        : new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
    const endOfRange =
      trendMode === "year"
        ? new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999))
        : new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

    if (page === "dashboard") {
      const [members, eventsThisMonth, recentLogs, recentServices] = await Promise.all([
        db.member.findMany({
          select: {
            status: true,
            ageGroup: true,
            attendance: { select: { attendanceDate: true } },
          },
        }),
        db.event.count({
          where: { eventDate: { gte: startOfMonth }, status: "scheduled" },
        }),
        db.appLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        db.event.findMany({
          orderBy: { eventDate: "asc" },
          where: {
            eventType: { in: ["sunday_service", "grace_night", "special_event"] },
            status: { in: ["scheduled", "completed"] },
            eventDate: { gte: startOfRange, lte: endOfRange },
          },
          select: {
            id: true,
            title: true,
            eventDate: true,
            speaker: true,
            eventType: true,
            attendance: { select: { id: true } },
          },
        }),
      ]);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      let activeCount = 0;
      let inactiveCount = 0;
      let guestCount = 0;
      let archivedCount = 0;
      let pendingCount = 0;
      let activeAdults = 0;
      let activeYouth = 0;
      let activeKids = 0;
      let inactiveAdults = 0;
      let inactiveYouth = 0;
      let inactiveKids = 0;

      members.forEach((m) => {
        if (m.status === "archived") {
          archivedCount++;
          return;
        }
        if (m.status === "pending") {
          pendingCount++;
          return;
        }

        let segment: "active" | "inactive" | "guest" = "guest";
        if (m.status === "active") segment = "active";
        else if (m.status === "inactive") segment = "inactive";
        else if (m.status === "guest") segment = "guest";
        else {
          const records = m.attendance || [];
          if (records.length <= 1) segment = "guest";
          else {
            const dates = records.map((a) => (a.attendanceDate ? new Date(a.attendanceDate).getTime() : 0));
            const latest = Math.max(...dates);
            segment = latest >= thirtyDaysAgo.getTime() ? "active" : "inactive";
          }
        }

        if (segment === "active") activeCount++;
        else if (segment === "inactive") inactiveCount++;
        else if (segment === "guest") guestCount++;

        const age = m.ageGroup || "Adult";
        if (segment === "active") {
          if (age === "Adult") activeAdults++;
          else if (age === "Youth") activeYouth++;
          else if (age === "Kids") activeKids++;
        } else if (segment === "inactive") {
          if (age === "Adult") inactiveAdults++;
          else if (age === "Youth") inactiveYouth++;
          else if (age === "Kids") inactiveKids++;
        }
      });

      const attendanceTrend = recentServices.map((ev) => ({
        id: ev.id,
        title: ev.title,
        eventDate: ev.eventDate.toISOString(),
        speaker: ev.speaker,
        eventType: ev.eventType,
        count: ev.attendance.length,
      }));

      return NextResponse.json({
        success: true,
        data: {
          stats: {
            activeCount,
            inactiveCount,
            guestCount,
            archivedCount,
            pendingCount,
            totalMembers: members.length,
            eventsThisMonth,
            smsPending: 0,
            activeAdults,
            activeYouth,
            activeKids,
            inactiveAdults,
            inactiveYouth,
            inactiveKids,
            recentLogs: JSON.parse(JSON.stringify(recentLogs)),
            attendanceTrend,
          },
        },
      });
    }

    if (page === "members") {
      const [members, ministries] = await Promise.all([
        db.member.findMany({
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            username: true,
            status: true,
            role: true,
            type: true,
            ageGroup: true,
            joinDate: true,
            createdAt: true,
            invitedBy: true,
            ministries: {
              where: { status: "active" },
              include: { ministry: { select: { id: true, name: true } } },
            },
            attendance: {
              select: {
                attendanceDate: true,
                event: { select: { title: true } },
              },
              orderBy: { attendanceDate: "desc" },
            },
          },
        }),
        db.ministry.findMany({
          where: { status: "active" },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          members: JSON.parse(JSON.stringify(members)),
          ministries,
        },
      });
    }

    if (page === "lifegroup") {
      const [registrations, leaders] = await Promise.all([
        db.lifeGroupRegistration.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            assignedLeader: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        db.member.findMany({
          where: {
            role: { in: ["admin", "moderator"] },
            status: { in: ["approved", "active"] },
          },
          select: { id: true, firstName: true, lastName: true },
          orderBy: { firstName: "asc" },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          registrations: JSON.parse(JSON.stringify(registrations)),
          leaders: JSON.parse(JSON.stringify(leaders)),
        },
      });
    }

    if (page === "review") {
      const [pending, pendingMinistries, historyMembers] = await Promise.all([
        db.member.findMany({
          where: { status: "pending" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            type: true,
            ageGroup: true,
            joinDate: true,
            invitedBy: true,
            createdAt: true,
            address: true,
            ministries: { include: { ministry: { select: { name: true } } } },
          },
        }),
        db.memberMinistry.findMany({
          where: { status: "pending" },
          orderBy: { requestedAt: "desc" },
          select: {
            id: true,
            memberId: true,
            ministryId: true,
            requestedAt: true,
            member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            ministry: { select: { id: true, name: true } },
          },
        }),
        db.member.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            type: true,
            ageGroup: true,
            address: true,
            invitedBy: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            ministries: { include: { ministry: { select: { name: true } } } },
          },
        }),
      ]);

      const formattedHistory = historyMembers.map((m) => ({
        id: m.id,
        kind: "registration",
        name: `${m.firstName} ${m.lastName}`.trim(),
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        phone: m.phone,
        memberType: m.type,
        ageGroup: m.ageGroup,
        address: m.address,
        invitedBy: m.invitedBy,
        status: m.status,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        details: { ministries: m.ministries.map((mm) => mm.ministry.name) },
      }));

      return NextResponse.json({
        success: true,
        data: {
          pending: JSON.parse(JSON.stringify(pending)),
          pendingMembers: JSON.parse(JSON.stringify(pending)),
          pendingMinistries: JSON.parse(JSON.stringify(pendingMinistries)),
          ministryRequests: JSON.parse(JSON.stringify(pendingMinistries)),
          historyItems: JSON.parse(JSON.stringify(formattedHistory)),
          reviewHistory: JSON.parse(JSON.stringify(formattedHistory)),
        },
      });
    }

    if (page === "events") {
      const events = await db.event.findMany({
        orderBy: [{ eventDate: "desc" }],
        include: {
          creator: { select: { firstName: true, lastName: true } },
          _count: { select: { attendance: true } },
        },
      });
      return NextResponse.json({
        success: true,
        data: { events: JSON.parse(JSON.stringify(events)) },
      });
    }

    if (page === "event-analytics") {
      const eventId = Number(searchParams.get("eventId"));
      if (!eventId) {
        return NextResponse.json({ success: false, message: "Missing eventId" }, { status: 400 });
      }
      const ev = await db.event.findUnique({
        where: { id: eventId },
        include: {
          creator: { select: { firstName: true, lastName: true } },
          attendance: {
            include: {
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  type: true,
                  ageGroup: true,
                  phone: true,
                  profilePicture: true,
                  joinDate: true,
                  _count: { select: { attendance: true } },
                },
              },
            },
            orderBy: { attendanceTime: "asc" },
          },
        },
      });
      if (!ev) {
        return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
      }
      const attendees = ev.attendance.map((a) => ({
        id: a.id,
        memberId: a.memberId,
        name: a.member ? `${a.member.firstName} ${a.member.lastName}`.trim() : (a as any).guestName || "Guest",
        type: a.member?.type || "NewFriend",
        ageGroup: a.member?.ageGroup || "Adult",
        phone: a.member?.phone || null,
        totalVisits: a.member?._count?.attendance || 1,
        checkInTime: a.attendanceTime ? a.attendanceTime.toISOString() : null,
        notes: a.notes || null,
      }));
      const adults = attendees.filter((a) => a.ageGroup === "Adult").length;
      const youth = attendees.filter((a) => a.ageGroup === "Youth").length;
      const kids = attendees.filter((a) => a.ageGroup === "Kids").length;
      const firstTimers = attendees.filter((a) => a.totalVisits <= 1 || a.type === "NewFriend").length;

      return NextResponse.json({
        success: true,
        data: {
          event: JSON.parse(JSON.stringify(ev)),
          stats: {
            total: attendees.length,
            adults,
            youth,
            kids,
            firstTimers,
            regulars: Math.max(0, attendees.length - firstTimers),
          },
          attendees,
        },
      });
    }

    if (page === "testimonies") {
      const testimonies = await db.testimony.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          member: {
            select: { id: true, firstName: true, lastName: true, profilePicture: true },
          },
          photos: { select: { photoPath: true } },
        },
      });
      return NextResponse.json({
        success: true,
        data: { testimonies: JSON.parse(JSON.stringify(testimonies)) },
      });
    }

    if (page === "ministries") {
      const ministries = await db.ministry.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { members: { where: { status: "active" } } } } },
      });
      return NextResponse.json({
        success: true,
        data: { ministries: JSON.parse(JSON.stringify(ministries)) },
      });
    }

    if (page === "send-sms") {
      const members = await db.member.findMany({
        where: { status: { notIn: ["archived", "pending"] } },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: { id: true, firstName: true, lastName: true, phone: true, type: true, ageGroup: true },
      });
      return NextResponse.json({
        success: true,
        data: { members: JSON.parse(JSON.stringify(members)) },
      });
    }

    if (page === "sms") {
      const [rawSmsLogs, rawAppLogs] = await Promise.all([
        db.smsLog.findMany({
          orderBy: { sentAt: "desc" },
          take: 200,
          include: {
            member: { select: { firstName: true, lastName: true, phone: true } },
            reminder: { select: { reminderType: true, event: { select: { title: true } } } },
          },
        }),
        db.appLog.findMany({
          where: {
            actionType: {
              in: ["sms_sent", "sms_failed", "sms_queued", "SMS_SENT", "SMS_FAILED", "sms_settings_updated"],
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ]);

      const smsLogsFormatted = rawSmsLogs.map((log) => {
        const memberName = log.member ? `${log.member.firstName} ${log.member.lastName}`.trim() : null;
        const target = memberName ? `${memberName} (${log.phoneNumber})` : log.phoneNumber;
        const performedBy = log.reminder?.event ? `Event: ${log.reminder.event.title}` : "System / Direct Gateway";
        return {
          id: log.id,
          memberId: log.memberId,
          actionType: log.status.toLowerCase() === "sent" ? "sms_sent" : "sms_failed",
          description: log.errorMessage ? `[Error: ${log.errorMessage}] ${log.message}` : log.message,
          rawMessage: log.message,
          errorMessage: log.errorMessage,
          phoneNumber: log.phoneNumber,
          performedByName: performedBy,
          targetName: target,
          memberName,
          createdAt: log.sentAt.toISOString(),
          eventTitle: log.reminder?.event?.title ?? null,
        };
      });

      const appLogsFormatted = rawAppLogs.map((log) => ({
        id: 1000000 + log.id,
        actionType: log.actionType,
        description: log.description,
        performedByName: log.performedByName,
        targetName: log.targetName,
        createdAt: log.createdAt.toISOString(),
      }));

      const logs = [...smsLogsFormatted, ...appLogsFormatted].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return NextResponse.json({
        success: true,
        data: { logs: JSON.parse(JSON.stringify(logs)) },
      });
    }

    if (page === "stewardshop") {
      const listings = await db.marketplaceListing.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          seller: {
            select: { id: true, firstName: true, lastName: true, isVerified: true },
          },
        },
      });

      const formatted = listings.map((l: any) => ({
        id: l.id,
        title: l.title,
        category: l.category,
        ogPrice: Number(l.ogPrice || 0),
        loveGiftAmount: Number(l.loveGiftAmount || 0),
        status: l.status,
        isPrivate: Boolean(l.isPrivate),
        moderationReason: l.moderationReason || null,
        createdAt: l.createdAt.toISOString(),
        seller: {
          id: l.seller?.id || l.memberId,
          firstName: l.seller?.firstName || "Member",
          lastName: l.seller?.lastName || "",
          isVerified: Boolean(l.seller?.isVerified),
        },
      }));

      const verifiedSet = new Set(formatted.filter((f) => f.seller.isVerified).map((f) => f.seller.id));
      const stats = {
        total: formatted.length,
        active: formatted.filter((f) => f.status === "active" && !f.isPrivate).length,
        privateCount: formatted.filter((f) => f.isPrivate).length,
        verifiedSellers: verifiedSet.size,
      };

      return NextResponse.json({
        success: true,
        data: { listings: formatted, stats },
      });
    }

    if (page === "church-settings") {
      const settingsList = await db.churchSetting.findMany();
      const settingsMap = settingsList.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {} as Record<string, string>);

      const settings: Record<string, string> = {};
      Object.keys(SETTINGS_DEFAULTS).forEach((k) => {
        settings[k] = settingsMap[k] ?? SETTINGS_DEFAULTS[k];
      });

      return NextResponse.json({
        success: true,
        data: { settings },
      });
    }

    if (page === "users") {
      const users = await db.member.findMany({
        where: { status: { notIn: ["pending", "archived"] } },
        orderBy: [{ role: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          lastLogin: true,
          username: true,
        },
      });
      return NextResponse.json({
        success: true,
        data: { users: JSON.parse(JSON.stringify(users)) },
      });
    }

    if (page === "birthdays") {
      const members = await db.member.findMany({
        where: { status: { in: ["active", "approved"] }, birthdate: { not: null } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          coverPhoto: true,
          birthdate: true,
        },
        orderBy: { firstName: "asc" },
      });
      return NextResponse.json({
        success: true,
        data: { members: JSON.parse(JSON.stringify(members)) },
      });
    }

    if (page === "multimedia") {
      const manilaDateString = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      const todayStart = new Date(`${manilaDateString}T00:00:00.000+08:00`);

      let eventsList = await db.event.findMany({
        where: { eventDate: { gte: todayStart } },
        orderBy: { eventDate: "asc" },
        include: {
          sopTasks: {
            orderBy: { id: "asc" },
            include: { completedBy: { select: { id: true, firstName: true, lastName: true } } },
          },
          creator: { select: { firstName: true, lastName: true } },
        },
        take: 10,
      });

      if (eventsList.length === 0) {
        eventsList = await db.event.findMany({
          orderBy: { eventDate: "desc" },
          include: {
            sopTasks: {
              orderBy: { id: "asc" },
              include: { completedBy: { select: { id: true, firstName: true, lastName: true } } },
            },
            creator: { select: { firstName: true, lastName: true } },
          },
          take: 5,
        });
      }

      const defaultEvent = eventsList.find((e) => e.presentationFile !== null) || eventsList[0] || null;
      const crew = await db.member.findMany({
        where: { role: "multimedia" },
        select: { id: true, firstName: true, lastName: true, profilePicture: true },
      });

      const settingsList = await db.churchSetting.findMany({
        where: {
          key: { in: ["multimedia_patch_soundboard", "multimedia_patch_switcher", "multimedia_sop_defaults"] },
        },
      });
      const customSettings = settingsList.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {} as Record<string, string>);

      return NextResponse.json({
        success: true,
        data: {
          event: JSON.parse(JSON.stringify(defaultEvent)),
          upcomingEvents: JSON.parse(JSON.stringify(eventsList)),
          crew: JSON.parse(JSON.stringify(crew)),
          customSettings,
        },
      });
    }

    if (page === "quiz-admin") {
      const [quizzes, events] = await Promise.all([
        db.sermonQuiz.findMany({
          orderBy: { sermonDate: "desc" },
          include: {
            _count: { select: { submissions: true, rewards: true } },
            rewardItems: true,
            questions: { orderBy: { dayNumber: "asc" } },
          },
        }),
        db.event.findMany({
          orderBy: { eventDate: "desc" },
          take: 40,
          select: {
            id: true,
            title: true,
            eventDate: true,
            speaker: true,
            commentary: true,
            presentationSlides: true,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          quizzes: JSON.parse(JSON.stringify(quizzes)),
          events: JSON.parse(JSON.stringify(events)),
        },
      });
    }

    if (page === "quiz-participants") {
      const quizId = Number(searchParams.get("quizId"));
      if (!quizId || isNaN(quizId)) {
        return NextResponse.json({ success: false, message: "quizId required" }, { status: 400 });
      }
      const quiz = await db.sermonQuiz.findUnique({
        where: { id: quizId },
        include: {
          questions: {
            orderBy: { dayNumber: "asc" },
            select: { id: true, dayNumber: true, questionType: true, questionText: true },
          },
          rewards: true,
          catchupSessions: { select: { memberId: true, isCompleted: true, startedAt: true } },
        },
      });
      if (!quiz) {
        return NextResponse.json({ success: false, message: "Quiz not found" }, { status: 404 });
      }
      const submissions = await db.quizSubmission.findMany({
        where: { quizId },
        include: {
          question: { select: { dayNumber: true } },
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureThumbnail: true,
              profilePicture: true,
              phone: true,
              ministries: {
                where: { status: "active" },
                include: { ministry: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { submittedAt: "asc" },
      });

      const memberMap = new Map<number, any>();
      for (const sub of submissions) {
        if (!sub.member) continue;
        const mId = sub.memberId;
        if (!memberMap.has(mId)) {
          const phone = sub.member.phone || "";
          const masked =
            phone.length > 7 ? phone.slice(0, 4) + "****" + phone.slice(-3) : phone;
          const pic = sub.member.profilePictureThumbnail || sub.member.profilePicture || null;
          memberMap.set(mId, {
            memberId: mId,
            name: `${sub.member.firstName} ${sub.member.lastName}`.trim(),
            firstName: sub.member.firstName,
            lastName: sub.member.lastName,
            photoUrl: pic ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${pic}` : null,
            maskedPhone: masked,
            ministries: sub.member.ministries?.map((mm: any) => mm.ministry.name) || [],
            submissions: [],
            firstSubmittedAt: sub.submittedAt,
            lastSubmittedAt: sub.submittedAt,
            totalScore: 0,
          });
        }
        const mData = memberMap.get(mId)!;
        mData.submissions.push({
          questionId: sub.questionId,
          dayNumber: sub.question.dayNumber,
          isCorrect: sub.isCorrect,
          score: sub.score,
          submittedAt: sub.submittedAt,
        });
        mData.totalScore += sub.score;
        if (!mData.lastSubmittedAt || sub.submittedAt > mData.lastSubmittedAt) {
          mData.lastSubmittedAt = sub.submittedAt;
        }
      }

      const catchupMap = new Map<number, boolean>();
      quiz.catchupSessions.forEach((c) => catchupMap.set(c.memberId, c.isCompleted));
      const rewardMap = new Map<number, any>();
      quiz.rewards.forEach((r) => rewardMap.set(r.memberId, r));

      const totalQuestions = quiz.questions.length || 7;
      const participants = Array.from(memberMap.values()).map((p) => {
        const dayProgress = [];
        for (let day = 1; day <= totalQuestions; day++) {
          const subForDay = p.submissions.find((s: any) => s.dayNumber === day);
          dayProgress.push({
            dayNumber: day,
            completed: Boolean(subForDay),
            isCorrect: subForDay?.isCorrect ?? false,
            score: subForDay?.score ?? 0,
          });
        }
        const daysCompleted = p.submissions.length;
        const isCompleted = daysCompleted >= totalQuestions;
        const rewardTier = getRewardTier(p.totalScore);
        const rewardClaim = rewardMap.get(p.memberId);
        return {
          memberId: p.memberId,
          name: p.name,
          photoUrl: p.photoUrl,
          maskedPhone: p.maskedPhone,
          ministries: p.ministries,
          daysCompleted,
          isCompleted,
          totalScore: p.totalScore,
          rewardTier,
          dayProgress,
          lastSubmittedAt: p.lastSubmittedAt,
          isCatchup: catchupMap.has(p.memberId),
          claimStatus: rewardClaim?.claimStatus || "unclaimed",
        };
      });

      participants.sort((a, b) => {
        if (b.daysCompleted !== a.daysCompleted) return b.daysCompleted - a.daysCompleted;
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return 0;
      });

      const totalParticipants = participants.length;
      const completedCount = participants.filter((p) => p.isCompleted).length;
      const perfectScoreCount = participants.filter((p) => p.totalScore >= totalQuestions).length;
      const completionRate =
        totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0;
      const averageScore =
        totalParticipants > 0
          ? parseFloat(
              (participants.reduce((acc, p) => acc + p.totalScore, 0) / totalParticipants).toFixed(1)
            )
          : 0;

      const dayDropoff = [];
      for (let day = 1; day <= totalQuestions; day++) {
        const count = submissions.filter((s) => s.question.dayNumber === day).length;
        const correctCount = submissions.filter(
          (s) => s.question.dayNumber === day && s.isCorrect
        ).length;
        dayDropoff.push({
          dayNumber: day,
          participants: count,
          correctCount,
          accuracyRate: count > 0 ? Math.round((correctCount / count) * 100) : 0,
        });
      }

      const tierDistribution = {
        PERFECT: participants.filter((p) => p.rewardTier === "PERFECT").length,
        EXCELLENT: participants.filter((p) => p.rewardTier === "EXCELLENT").length,
        GOOD: participants.filter((p) => p.rewardTier === "GOOD").length,
        PARTICIPANT: participants.filter((p) => p.rewardTier === "PARTICIPANT").length,
      };

      return NextResponse.json({
        success: true,
        data: JSON.parse(
          JSON.stringify({
            quiz: {
              id: quiz.id,
              title: quiz.title,
              sermonDate: quiz.sermonDate,
              status: quiz.status,
              totalQuestions,
            },
            summary: {
              totalParticipants,
              totalSubmissions: submissions.length,
              completedCount,
              completionRate,
              perfectScoreCount,
              averageScore,
              tierDistribution,
              dayDropoff,
            },
            participants,
          })
        ),
      });
    }

    if (page === "quiz-rewards") {
      const quizId = Number(searchParams.get("quizId"));
      if (!quizId || isNaN(quizId)) {
        return NextResponse.json({ success: false, message: "quizId required" }, { status: 400 });
      }
      const rewards = await db.quizReward.findMany({
        where: { quizId },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              profilePicture: true,
            },
          },
        },
        orderBy: [{ totalScore: "desc" }, { createdAt: "desc" }],
      });
      return NextResponse.json({
        success: true,
        data: { rewards: JSON.parse(JSON.stringify(rewards)) },
      });
    }

    return NextResponse.json({ success: true, data: { viewerRole: member?.role || "admin" } });
  } catch (err: any) {
    console.error("[api/mobile/admin GET]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to load admin data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    let hasAdminAccess = Boolean(
      member && ["admin", "moderator", "usher", "multimedia"].includes(member.role || "")
    );
    if (!hasAdminAccess && member?.id) {
      const pm = await db.memberMinistry
        .findFirst({ where: { memberId: member.id, ministryId: 11, status: "active" } })
        .catch(() => null);
      hasAdminAccess = Boolean(pm);
    }
    if (!member || !hasAdminAccess) {
      return NextResponse.json({ success: false, message: "Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "update_member") {
      const targetId = Number(body?.memberId);
      const data: any = {};
      if (body.status) {
        data.status = body.status;
        data.statusChangedAt = new Date();
      }
      if (body.type) data.type = body.type;
      if (body.ageGroup) data.ageGroup = body.ageGroup;
      if (body.role) data.role = body.role;
      if (Object.keys(data).length > 0) {
        await db.member.update({ where: { id: targetId }, data });
      }
      if (Array.isArray(body.ministryIds)) {
        const minIds = body.ministryIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
        await db.memberMinistry.deleteMany({ where: { memberId: targetId } });
        for (const minId of minIds) {
          await db.memberMinistry.create({
            data: {
              memberId: targetId,
              ministryId: minId,
              status: "active",
              approvedAt: new Date(),
            },
          });
        }
      }
      return NextResponse.json({ success: true });
    }

    if (
      action === "approve_member" ||
      action === "reject_member" ||
      action === "revert_member" ||
      action === "cancel_member" ||
      action === "review_member"
    ) {
      const targetId = Number(body?.memberId || body?.id);
      const sub =
        action === "approve_member"
          ? "approve"
          : action === "reject_member"
          ? "reject"
          : action === "revert_member"
          ? "revert"
          : action === "cancel_member"
          ? "cancel"
          : String(body?.subAction || "approve");

      if (sub === "approve") {
        await db.member.update({
          where: { id: targetId },
          data: { status: "approved", statusChangedAt: new Date() },
        });
      } else if (sub === "revert") {
        await db.member.update({
          where: { id: targetId },
          data: { status: "pending", statusChangedAt: new Date() },
        });
      } else if (sub === "inactive") {
        await db.member.update({
          where: { id: targetId },
          data: { status: "inactive", statusChangedAt: new Date() },
        });
      } else if (sub === "reject" || sub === "cancel" || sub === "delete") {
        await db.member.delete({ where: { id: targetId } });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "add_member") {
      const { firstName, lastName, email, phone, joinDate, ageGroup, type, role } = body;
      const username = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, "")}.${lastName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")}`;
      const passwordHash = await bcrypt.hash("hgf12345", 10);
      const created = await db.member.create({
        data: {
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
          username,
          password: passwordHash,
          joinDate: joinDate ? new Date(joinDate) : new Date(),
          ageGroup: ageGroup || "Adult",
          type: type || "GrowingFriend",
          role: role || "user",
          status: "approved",
        },
      });
      return NextResponse.json({ success: true, member: JSON.parse(JSON.stringify(created)) });
    }

    if (action === "delete_member") {
      const targetId = Number(body?.memberId);
      await db.member.delete({ where: { id: targetId } });
      return NextResponse.json({ success: true });
    }

    if (action === "reset_member_password") {
      const targetId = Number(body?.memberId);
      const tempPass = `HGF-${Math.floor(1000 + Math.random() * 9000)}`;
      const passwordHash = await bcrypt.hash(tempPass, 10);
      const target = await db.member.update({
        where: { id: targetId },
        data: { password: passwordHash },
        select: { username: true, firstName: true, lastName: true },
      });
      return NextResponse.json({
        success: true,
        username: target.username || `${target.firstName}.${target.lastName}`.toLowerCase(),
        password: tempPass,
      });
    }

    if (action === "update_lifegroup") {
      const id = Number(body?.id);
      const leaderId = body.assignedLeaderId ? Number(body.assignedLeaderId) : null;
      const updated = await db.lifeGroupRegistration.update({
        where: { id },
        data: {
          assignedLeaderId: leaderId,
          status: leaderId ? "appointed" : "pending",
          ...(body.fullName ? { fullName: body.fullName } : {}),
          ...(body.age ? { age: Number(body.age) } : {}),
          ...(body.phone ? { phone: body.phone } : {}),
          ...(body.rolePreference ? { rolePreference: body.rolePreference } : {}),
          ...(body.area ? { area: body.area } : {}),
        },
        include: { assignedLeader: { select: { id: true, firstName: true, lastName: true } } },
      });
      return NextResponse.json({ success: true, registration: JSON.parse(JSON.stringify(updated)) });
    }

    if (action === "delete_lifegroup") {
      await db.lifeGroupRegistration.delete({ where: { id: Number(body?.id) } });
      return NextResponse.json({ success: true });
    }

    if (action === "review_ministry") {
      const id = Number(body?.id);
      const subAction = String(body?.subAction || "approve");
      if (subAction === "approve") {
        await db.memberMinistry.update({ where: { id }, data: { status: "active", approvedAt: new Date() } });
      } else {
        await db.memberMinistry.delete({ where: { id } });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "save_event" || action === "create_event" || action === "update_event") {
      const id = body?.id || body?.eventId;
      const title = String(body?.title || "").trim();
      const description = body?.description ? String(body.description).trim() : null;
      const eventDate = body?.eventDate || body?.date;
      const rawStart = String(body?.startTime || "09:00").trim();
      const rawEnd = body?.endTime ? String(body.endTime).trim() : null;
      const location = body?.location ? String(body.location).trim() : "House of Grace Fellowship";
      const rawType = String(body?.eventType || body?.type || "sunday_service").toLowerCase();
      const typeMap: Record<string, string> = {
        sunday_service: "sunday_service",
        sundayservice: "sunday_service",
        prayer_meeting: "prayer_meeting",
        prayermeeting: "prayer_meeting",
        bible_study: "bible_study",
        biblestudy: "bible_study",
        special_event: "special_event",
        specialevent: "special_event",
        youthfellowship: "special_event",
        grace_night: "grace_night",
        gracenight: "grace_night",
        other: "other",
        outreach: "other",
      };
      const normalizedType = typeMap[rawType.replace(/[^a-z_]/g, "")] || "sunday_service";
      const status = ["scheduled", "completed", "cancelled"].includes(String(body?.status || "").toLowerCase())
        ? String(body.status).toLowerCase()
        : "scheduled";
      const speaker = body?.speaker ? String(body.speaker).trim() : null;
      const commentary = body?.commentary ? String(body.commentary).trim() : null;
      const coverPhoto =
        body?.coverPhoto !== undefined
          ? body.coverPhoto
            ? String(body.coverPhoto)
                .replace(/^https?:\/\/[^/]+\/uploads\/events\//, "")
                .replace(/^\/uploads\/events\//, "")
            : null
          : undefined;

      const parseTimeStr = (t: string) => {
        if (!t) return new Date("1970-01-01T09:00:00Z");
        if (t.includes("T")) return new Date(t);
        const clean = t.slice(0, 5);
        return new Date(`1970-01-01T${clean}:00Z`);
      };
      const startDateTime = parseTimeStr(rawStart);
      const endDateTime = rawEnd ? parseTimeStr(rawEnd) : null;

      if (id && action !== "create_event") {
        const updated = await db.event.update({
          where: { id: Number(id) },
          data: {
            title,
            description,
            eventDate: new Date(eventDate),
            startTime: startDateTime,
            endTime: endDateTime,
            location,
            eventType: normalizedType as any,
            status: status as any,
            speaker,
            commentary,
            ...(coverPhoto !== undefined ? { coverPhoto } : {}),
          },
        });
        return NextResponse.json({ success: true, event: JSON.parse(JSON.stringify(updated)) });
      } else {
        const created = await db.event.create({
          data: {
            title,
            description,
            eventDate: new Date(eventDate),
            startTime: startDateTime,
            endTime: endDateTime,
            location,
            eventType: normalizedType as any,
            status: status as any,
            speaker,
            commentary,
            coverPhoto: coverPhoto || null,
            createdBy: member.id,
          },
        });

        // Create corresponding EVENT post on community feed just like web app
        await db.post
          .create({
            data: {
              authorId: member.id,
              type: "EVENT",
              content: `📅 New Event: ${title}\n[event:${created.id}]`,
              imageUrl: coverPhoto ? `/uploads/events/${coverPhoto}` : null,
              visibility: "PUBLIC",
            },
          })
          .catch(() => {});

        notifyAllMembers({
          actorId: member.id,
          type: "general",
          title: `📅 New Event: ${title}`,
          body: `${title} at ${location || "House of Grace Fellowship"}`,
          link: `/event/${created.id}`,
        }).catch(() => {});

        return NextResponse.json({ success: true, event: JSON.parse(JSON.stringify(created)) });
      }
    }

    if (action === "delete_event") {
      const targetId = Number(body?.id || body?.eventId);
      await db.event.delete({ where: { id: targetId } });
      return NextResponse.json({ success: true });
    }

    if (action === "toggle_testimony_read") {
      const id = Number(body?.id);
      await db.testimony.update({
        where: { id },
        data: { readByAnnouncer: Boolean(body?.readByAnnouncer) },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "save_ministry") {
      const { id, name, description, status } = body;
      if (id) {
        const updated = await db.ministry.update({
          where: { id: Number(id) },
          data: { name, description: description || null, status: status || "active" },
        });
        return NextResponse.json({ success: true, ministry: JSON.parse(JSON.stringify(updated)) });
      } else {
        const created = await db.ministry.create({
          data: { name, description: description || null, status: status || "active" },
        });
        return NextResponse.json({ success: true, ministry: JSON.parse(JSON.stringify(created)) });
      }
    }

    if (action === "moderate_listing") {
      if (body.sellerId !== undefined) {
        await db.member.update({
          where: { id: Number(body.sellerId) },
          data: { isVerifiedSeller: Boolean(body.isVerified) } as any,
        });
      }
      if (body.listingId !== undefined) {
        await db.marketplaceListing.update({
          where: { id: Number(body.listingId) },
          data: {
            isPrivate: Boolean(body.isPrivate),
            moderationReason: body.moderationReason || null,
          } as any,
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "save_church_settings") {
      const settings = body.settings || {};
      for (const [key, value] of Object.entries(settings)) {
        await db.churchSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "toggle_sop_task") {
      const taskId = Number(body?.taskId);
      const existing = await db.multimediaSopTask.findUnique({ where: { id: taskId } });
      if (existing) {
        const nextCompleted = !existing.isCompleted;
        await db.multimediaSopTask.update({
          where: { id: taskId },
          data: {
            isCompleted: nextCompleted,
            completedAt: nextCompleted ? new Date() : null,
            completedById: nextCompleted ? member.id : null,
          },
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "send_sms") {
      const memberIds: number[] = Array.isArray(body?.memberIds) ? body.memberIds.map(Number) : [];
      const message = String(body?.message || "").trim();
      if (!memberIds.length || !message) {
        return NextResponse.json({ success: false, message: "Missing recipients or message" }, { status: 400 });
      }
      const recipients = await db.member.findMany({
        where: {
          id: { in: memberIds },
          phone: { not: null },
          NOT: [{ firstName: "HGF" }, { phone: "09000000000" }],
          ageGroup: { not: "Kids" },
        },
        select: { id: true, firstName: true, lastName: true, phone: true },
      });
      const seenPhones = new Set<string>();
      let sent = 0;
      for (const r of recipients) {
        if (!r.phone || seenPhones.has(r.phone)) continue;
        seenPhones.add(r.phone);
        try {
          await sendSms(r.phone, message);
          await db.smsLog.create({
            data: {
              memberId: r.id,
              phoneNumber: r.phone,
              message,
              status: "Sent",
            },
          });
          sent++;
        } catch (err: any) {
          await db.smsLog.create({
            data: {
              memberId: r.id,
              phoneNumber: r.phone,
              message,
              status: "Failed",
              errorMessage: err?.message || "Gateway error",
            },
          });
        }
      }
      return NextResponse.json({ success: true, sent });
    }

    if (action === "birthday_demo") {
      const type = body?.type === "monthly" ? "monthly" : "daily";
      const targetMemberId = body?.memberId ? Number(body.memberId) : null;
      if (type === "daily" && targetMemberId) {
        const cel = await db.member.findUnique({ where: { id: targetMemberId } });
        if (cel) {
          const payload = {
            memberId: cel.id,
            name: `${cel.firstName} ${cel.lastName}`.trim(),
            date: cel.birthdate ? new Date(cel.birthdate).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }) : "Today",
            message: `🎉 Wishing a very Happy and Blessed Birthday to our dear ${cel.firstName}! 🎂🎈\n\nOn this special day, we praise God for the gift of your life and the unique blessing you are to our church family. May the Lord guide your steps, keep you in His perfect peace, and shower you with His abundant grace in this new year of your life!\n\nWe celebrate you today on behalf of your family here at House of Grace Fellowship! ❤️`,
            verseText: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.",
            verseRef: "Numbers 6:24-25",
          };
          await db.post.create({
            data: {
              authorId: member.id,
              type: "BIRTHDAY_DAILY",
              content: JSON.stringify(payload),
              visibility: "PUBLIC",
            },
          });
        }
      } else {
        const now = new Date();
        const curMonth = now.getMonth() + 1;
        const monthName = now.toLocaleDateString("en-US", { month: "long" });
        const allWithBirthdays = await db.member.findMany({
          where: { status: { in: ["active", "approved"] }, birthdate: { not: null } },
          select: { id: true, firstName: true, lastName: true, birthdate: true },
        });
        const celebrants = allWithBirthdays
          .filter((m) => m.birthdate && new Date(m.birthdate).getUTCMonth() + 1 === curMonth)
          .map((m) => ({
            id: m.id,
            name: `${m.firstName} ${m.lastName}`.trim(),
            day: new Date(m.birthdate!).getUTCDate(),
          }))
          .sort((a, b) => a.day - b.day);
        await db.post.create({
          data: {
            authorId: member.id,
            type: "BIRTHDAY_MONTHLY",
            content: JSON.stringify({ month: monthName, celebrants }),
            visibility: "PUBLIC",
          },
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "fetch_quiz_transcript") {
      const url = String(body?.url || "").trim();
      const cleanId = extractVideoId(url);
      if (!cleanId) {
        return NextResponse.json(
          { success: false, message: "Please provide a valid YouTube sermon video URL." },
          { status: 400 }
        );
      }
      const ytResult = await fetchTranscriptWithMeta(cleanId);
      if (!ytResult || !ytResult.text?.trim()) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Could not extract captions automatically (YouTube cloud IP check or captions disabled). Paste notes manually below.",
          },
          { status: 422 }
        );
      }
      return NextResponse.json({
        success: true,
        data: {
          transcript: ytResult.text,
          wordCount: ytResult.wordCount,
          charCount: ytResult.charCount,
          segmentCount: ytResult.segmentCount,
          language: ytResult.language,
          title: ytResult.title,
        },
      });
    }

    if (action === "generate_quiz") {
      const sermonDate = String(body?.sermonDate || "").trim();
      const youtubeUrl = body?.youtubeUrl ? String(body.youtubeUrl).trim() : "";
      const eventId = body?.eventId ? Number(body.eventId) : null;
      let sourceText = body?.sermonText ? String(body.sermonText).trim() : "";
      let transcriptSource = "manual";

      if (!sermonDate) {
        return NextResponse.json(
          { success: false, message: "Sunday sermon date is required." },
          { status: 400 }
        );
      }

      if (!sourceText && youtubeUrl) {
        const cleanId = extractVideoId(youtubeUrl);
        if (cleanId) {
          const ytResult = await fetchTranscriptWithMeta(cleanId).catch(() => null);
          if (ytResult?.text?.trim()) {
            sourceText = ytResult.text;
            transcriptSource = "youtube";
          }
        }
      }

      if (!sourceText && eventId) {
        const ev = await db.event.findUnique({
          where: { id: eventId },
          select: { commentary: true },
        });
        if (ev?.commentary?.trim()) {
          sourceText = ev.commentary;
          transcriptSource = "slides";
        }
      }

      if (!sourceText) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please paste sermon notes, provide a YouTube URL with captions, or select an event with uploaded sermon slides.",
          },
          { status: 400 }
        );
      }

      const generated = await generateQuiz(sourceText, sermonDate);
      return NextResponse.json({
        success: true,
        data: {
          transcriptSource,
          sourceText,
          title: generated.title,
          announcementCaption: generated.announcementCaption,
          questions: generated.questions,
        },
      });
    }

    if (action === "save_quiz" || action === "publish_quiz") {
      const {
        quizId: rawQuizId,
        title,
        sermonDate,
        youtubeUrl,
        transcriptText,
        announcementCaption,
        questions,
        eventId,
        notifyArchiveMembers,
      } = body;

      if (!title || !sermonDate || !Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json(
          { success: false, message: "Title, sermon date, and questions are required." },
          { status: 400 }
        );
      }

      const youtubeVideoId = youtubeUrl ? extractVideoId(String(youtubeUrl)) : null;
      const isPast = isQuizWeekExpired(sermonDate);
      const shouldPublish = action === "publish_quiz";
      const targetStatus = isPast ? "completed" : "draft";

      let parsedEventId = eventId ? Number(eventId) : NaN;
      if (isNaN(parsedEventId) || !parsedEventId) {
        const sDate = new Date(sermonDate);
        const dayStr = sDate.toISOString().split("T")[0];
        const existingEvent = await db.event.findFirst({
          where: {
            eventType: "sunday_service",
            eventDate: {
              gte: new Date(`${dayStr}T00:00:00.000Z`),
              lte: new Date(`${dayStr}T23:59:59.999Z`),
            },
          },
        });
        if (existingEvent) {
          parsedEventId = existingEvent.id;
        } else {
          const createdEv = await db.event.create({
            data: {
              title: String(title) || "Sunday Worship Service",
              eventType: "sunday_service",
              eventDate: sDate,
              startTime: new Date("1970-01-01T09:00:00Z"),
              location: "House of Grace Sanctuary",
              description: `Sunday Service sermon: ${title}`,
              createdBy: member.id,
            },
          });
          parsedEventId = createdEv.id;
        }
      }

      let savedQuizId = rawQuizId ? Number(rawQuizId) : null;
      if (savedQuizId) {
        await db.sermonQuiz.update({
          where: { id: savedQuizId },
          data: {
            title: String(title),
            sermonDate: new Date(sermonDate),
            youtubeUrl: youtubeUrl ? String(youtubeUrl) : null,
            youtubeVideoId: youtubeVideoId || null,
            transcriptText: transcriptText ? String(transcriptText) : null,
            announcementCaption: announcementCaption ? String(announcementCaption) : null,
            eventId: parsedEventId,
            status: targetStatus as any,
          },
        });
        await db.quizQuestion.deleteMany({ where: { quizId: savedQuizId } });
        await db.quizQuestion.createMany({
          data: questions.map((q: any) => ({
            quizId: savedQuizId!,
            dayNumber: Number(q.dayNumber),
            questionType: q.questionType,
            questionText: String(q.questionText),
            correctAnswer: String(q.correctAnswer),
            options: q.options || null,
            hint: q.hint ? String(q.hint) : null,
            explanation: q.explanation ? String(q.explanation) : null,
          })),
        });
      } else {
        const createdQuiz = await db.sermonQuiz.create({
          data: {
            title: String(title),
            sermonDate: new Date(sermonDate),
            youtubeUrl: youtubeUrl ? String(youtubeUrl) : null,
            youtubeVideoId: youtubeVideoId || null,
            transcriptText: transcriptText ? String(transcriptText) : null,
            announcementCaption: announcementCaption ? String(announcementCaption) : null,
            status: targetStatus as any,
            createdById: member.id,
            eventId: parsedEventId,
            questions: {
              create: questions.map((q: any) => ({
                dayNumber: Number(q.dayNumber),
                questionType: q.questionType,
                questionText: String(q.questionText),
                correctAnswer: String(q.correctAnswer),
                options: q.options || null,
                hint: q.hint ? String(q.hint) : null,
                explanation: q.explanation ? String(q.explanation) : null,
              })),
            },
          },
        });
        savedQuizId = createdQuiz.id;
      }

      if (isPast) {
        if (notifyArchiveMembers) {
          const activeMembers = await db.member.findMany({
            where: { status: { in: ["active", "approved"] } },
            select: { id: true },
          });
          if (activeMembers.length > 0) {
            await db.notification.createMany({
              data: activeMembers.map((m) => ({
                memberId: m.id,
                type: "quiz_announcement" as const,
                title: "📖 New Catch-Up Quiz Available",
                body: `Missed a Sunday? "${title}" is now open in the Catch-Up Archive. Tap to catch up and earn your points!`,
                link: `/quiz/hub?tab=archive&quizId=${savedQuizId}`,
                actorId: member.id,
              })),
            });
          }
        }
        return NextResponse.json({
          success: true,
          data: { quizId: savedQuizId, archived: true },
          message: "Past sermon quiz saved to Catch-Up Archive!",
        });
      }

      if (!shouldPublish) {
        return NextResponse.json({
          success: true,
          data: { quizId: savedQuizId, status: "draft" },
          message: "Quiz saved as draft!",
        });
      }

      // Publish live quiz week!
      const quizToPublish = await db.sermonQuiz.findUnique({
        where: { id: savedQuizId },
        include: { questions: true },
      });
      if (!quizToPublish) {
        return NextResponse.json({ success: false, message: "Quiz not found" }, { status: 404 });
      }

      const thumbUrl = quizToPublish.youtubeVideoId
        ? `https://img.youtube.com/vi/${quizToPublish.youtubeVideoId}/hqdefault.jpg`
        : null;
      const announceContent = [
        quizToPublish.announcementCaption ||
          `📺 Here's a replay of Sunday's sermon: "${quizToPublish.title}"`,
        "",
        "🧠 Get ready for this week's Quiz for Christ!",
        "7 daily challenges starting today — from easy to hard.",
        "Perfect score? You might win a prize! 🎁",
      ].join("\n");

      const announcePost = await db.post.create({
        data: {
          authorId: member.id,
          type: "QUIZ_ANNOUNCEMENT",
          content: announceContent,
          imageUrl: thumbUrl,
          visibility: "MEMBERS_ONLY",
        },
      });

      await db.sermonQuiz.update({
        where: { id: savedQuizId },
        data: { status: "published", announcementPostId: announcePost.id },
      });

      const activeMembers = await db.member.findMany({
        where: { status: { in: ["active", "approved"] } },
        select: { id: true },
      });
      if (activeMembers.length > 0) {
        await db.notification.createMany({
          data: activeMembers.map((m) => ({
            memberId: m.id,
            type: "quiz_announcement" as const,
            title: "🧠 This Week's Quiz for Christ is LIVE!",
            body: `"${quizToPublish.title}" — 7 daily challenges built on Sunday's message. Tap to start and earn points!`,
            link: `/quiz?quizId=${savedQuizId}`,
            actorId: member.id,
          })),
        });
      }

      const relDay = getQuizDayForDate(quizToPublish.sermonDate);
      const curDay = Math.min(Math.max(relDay, 1), 7);
      for (let dNum = 1; dNum <= curDay; dNum++) {
        const dayInfo = QUIZ_DAYS.find((d) => d.dayNumber === dNum);
        const question = quizToPublish.questions.find((q) => q.dayNumber === dNum);
        if (!dayInfo || !question) continue;
        const typeInfo = QUIZ_TYPE_LABELS[question.questionType] || QUIZ_TYPE_LABELS[dayInfo.type];
        const dailyPost = await db.post.create({
          data: {
            authorId: member.id,
            type: "QUIZ_DAILY",
            content: [
              `🧠 Day ${dNum} Quiz is LIVE! 🧠`,
              "",
              `Topic: "${quizToPublish.title}"`,
              "",
              `${typeInfo?.emoji || "🧠"} Today's Challenge: ${typeInfo?.label || question.questionType}`,
              `⚡ Difficulty: ${typeInfo?.difficulty || "Medium"}`,
              "",
              "Let's test our understanding of Sunday's sermon and study the Word together! Tap the play button below to launch today's game and earn points.",
            ].join("\n"),
            visibility: "MEMBERS_ONLY",
          },
        });
        await db.quizQuestion.update({
          where: { id: question.id },
          data: { feedPostId: dailyPost.id },
        });
      }

      return NextResponse.json({
        success: true,
        data: { quizId: savedQuizId, status: "published", postId: announcePost.id },
        message: "Live Quiz Week published & announced to the community!",
      });
    }

    if (action === "announce_quiz_rewards") {
      const rewardTier = String(body?.rewardTier || "PERFECT") as QuizRewardTier;
      const title = String(body?.title || "").trim();
      const description = String(body?.description || "").trim();
      const imageUrl = body?.imageUrl ? String(body.imageUrl).trim() : null;

      const validTiers = Object.values(QuizRewardTier);
      if (!title || !validTiers.includes(rewardTier)) {
        return NextResponse.json(
          { success: false, message: "Valid reward tier and title are required." },
          { status: 400 }
        );
      }

      const quiz =
        (await db.sermonQuiz.findFirst({
          where: { status: "published" },
          orderBy: { sermonDate: "desc" },
        })) ||
        (await db.sermonQuiz.findFirst({
          orderBy: { sermonDate: "desc" },
        }));

      if (!quiz) {
        return NextResponse.json(
          { success: false, message: "No quiz found to attach this reward to." },
          { status: 404 }
        );
      }

      const tierLabels: Record<string, string> = {
        PERFECT: "🏆 7/7 Perfect Score",
        EXCELLENT: "🌟 6/7 Excellent Score",
        GOOD: "👏 4/7 or 5/7 Good Score",
        PARTICIPANT: "🙏 Sincere Participation",
      };

      const postContent = [
        "🎁 WEEKLY QUIZ REWARD ANNOUNCEMENT! 🎁",
        "",
        `Sermon: "${quiz.title}"`,
        `Requirement: ${tierLabels[rewardTier] || rewardTier}`,
        `Prize: ${title}`,
        description ? `About the prize: ${description}` : "",
        "",
        "Let's study the Word and review Sunday's sermon together. Play the daily challenges, climb the leaderboard, and unlock this week's reward! 🧠✨",
      ]
        .filter(Boolean)
        .join("\n");

      const existingItem = await db.quizRewardItem.findUnique({
        where: { quizId_rewardTier: { quizId: quiz.id, rewardTier } },
        select: { id: true, postId: true },
      });

      if (existingItem) {
        await db.quizRewardItem.update({
          where: { id: existingItem.id },
          data: { title, description: description || null, imageUrl },
        });
        if (existingItem.postId) {
          await db.post
            .update({
              where: { id: existingItem.postId },
              data: { content: postContent, imageUrl },
            })
            .catch(() => null);
        } else {
          const post = await db.post.create({
            data: {
              authorId: member.id,
              type: "QUIZ_REWARD",
              content: postContent,
              imageUrl,
              visibility: "MEMBERS_ONLY",
            },
          });
          await db.quizRewardItem.update({
            where: { id: existingItem.id },
            data: { postId: post.id },
          });
        }
        return NextResponse.json({
          success: true,
          message: "Reward updated and community feed post synced!",
        });
      }

      const newItem = await db.quizRewardItem.create({
        data: {
          quizId: quiz.id,
          rewardTier,
          title,
          description: description || null,
          imageUrl,
        },
      });
      const post = await db.post.create({
        data: {
          authorId: member.id,
          type: "QUIZ_REWARD",
          content: postContent,
          imageUrl,
          visibility: "MEMBERS_ONLY",
        },
      });
      await db.quizRewardItem.update({
        where: { id: newItem.id },
        data: { postId: post.id },
      });

      await notifyAllMembers({
        actorId: member.id,
        type: "quiz_announcement",
        title: "🎁 New Quiz Reward Announced!",
        body: `We are giving away "${title}" for achieving a ${rewardTier.toLowerCase()} score this week. Play now!`,
        link: "/quiz",
      });

      return NextResponse.json({
        success: true,
        message: "Reward announced and posted to the community feed!",
      });
    }

    if (action === "nudge_quiz_participants") {
      const quizId = Number(body?.quizId);
      const targetMemberId = body?.targetMemberId ? Number(body.targetMemberId) : null;
      const nudgeAllInProgress = Boolean(body?.nudgeAllInProgress);

      if (!quizId || isNaN(quizId)) {
        return NextResponse.json({ success: false, message: "quizId required" }, { status: 400 });
      }
      const quiz = await db.sermonQuiz.findUnique({
        where: { id: quizId },
        include: { questions: { select: { id: true } } },
      });
      if (!quiz) {
        return NextResponse.json({ success: false, message: "Quiz not found" }, { status: 404 });
      }
      const totalQuestions = quiz.questions.length || 7;
      let targetIds: number[] = [];

      if (targetMemberId) {
        targetIds = [targetMemberId];
      } else if (nudgeAllInProgress) {
        const subs = await db.quizSubmission.findMany({
          where: { quizId },
          select: { memberId: true },
        });
        const counts = new Map<number, number>();
        subs.forEach((s) => counts.set(s.memberId, (counts.get(s.memberId) || 0) + 1));
        counts.forEach((c, mId) => {
          if (c < totalQuestions) targetIds.push(mId);
        });
      }

      if (targetIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: { count: 0 },
          message: "No eligible in-progress participants to nudge.",
        });
      }

      for (const mId of targetIds) {
        await createNotification({
          memberId: mId,
          type: "quiz_daily",
          title: "🧠 Keep your Quiz streak going!",
          body: `You have questions waiting in "${quiz.title}". Answer today's challenge to stay in the running for Sunday prizes!`,
          link: `/quiz?quizId=${quiz.id}`,
          actorId: member.id,
        });
      }

      return NextResponse.json({
        success: true,
        data: { count: targetIds.length },
        message: `Sent reminder to ${targetIds.length} participant${targetIds.length > 1 ? "s" : ""}!`,
      });
    }

    if (action === "mark_quiz_reward_distributed") {
      const rewardId = Number(body?.rewardId);
      if (!rewardId || isNaN(rewardId)) {
        return NextResponse.json({ success: false, message: "rewardId required" }, { status: 400 });
      }
      await db.quizReward.update({
        where: { id: rewardId },
        data: { claimStatus: "distributed" },
      });
      return NextResponse.json({ success: true, message: "Reward marked as distributed!" });
    }

    if (action === "backfill_quiz_posts") {
      const quiz = await db.sermonQuiz.findFirst({
        where: { status: "published" },
        orderBy: { sermonDate: "desc" },
        include: { questions: { orderBy: { dayNumber: "asc" } } },
      });
      if (!quiz) {
        return NextResponse.json(
          { success: false, message: "No active published quiz week to backfill." },
          { status: 400 }
        );
      }
      const relDay = getQuizDayForDate(quiz.sermonDate);
      const curDay = Math.min(Math.max(relDay, 1), 7);
      let createdCount = 0;
      for (let dNum = 1; dNum <= curDay; dNum++) {
        const q = quiz.questions.find((x) => x.dayNumber === dNum);
        if (!q || q.feedPostId) continue;
        const typeInfo = QUIZ_TYPE_LABELS[q.questionType] || {
          label: q.questionType,
          difficulty: "Medium",
          emoji: "🧠",
        };
        const p = await db.post.create({
          data: {
            authorId: member.id,
            type: "QUIZ_DAILY",
            content: [
              `🧠 Day ${dNum} Quiz is LIVE! 🧠`,
              "",
              `Topic: "${quiz.title}"`,
              "",
              `${typeInfo.emoji} Today's Challenge: ${typeInfo.label}`,
              `⚡ Difficulty: ${typeInfo.difficulty}`,
              "",
              "Let's test our understanding of Sunday's sermon and study the Word together! Tap the play button below to launch today's game and earn points.",
            ].join("\n"),
            visibility: "MEMBERS_ONLY",
          },
        });
        await db.quizQuestion.update({ where: { id: q.id }, data: { feedPostId: p.id } });
        createdCount++;
      }
      return NextResponse.json({
        success: true,
        message:
          createdCount > 0
            ? `Backfilled ${createdCount} daily quiz post(s)!`
            : "All daily posts up to today are already published!",
      });
    }

    return NextResponse.json({ success: false, message: "Unknown admin action" }, { status: 400 });
  } catch (err: any) {
    console.error("[api/mobile/admin POST]", err?.message);
    return NextResponse.json({ success: false, message: err?.message || "Failed to process action" }, { status: 500 });
  }
}
