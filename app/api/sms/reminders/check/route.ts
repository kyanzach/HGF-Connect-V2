import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BIBLE_VERSES, TEMPLATES } from "@/lib/smsTemplates";

// POST /api/sms/reminders/check — Secure cron endpoint to generate and batch SMS reminders
export async function POST(request: NextRequest) {
  const secretHeader = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs: string[] = [];
    
    // ─────────────────────────────────────────────────────────────────
    // Step 1: Auto-generate reminders for new/existing scheduled events
    // ─────────────────────────────────────────────────────────────────
    
    // Get current Manila time string
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    const second = parts.find(p => p.type === 'second')?.value;
    const manilaTimeStr = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    const manilaTime = new Date(manilaTimeStr);

    logs.push(`Current Manila Time: ${manilaTimeStr}`);

    // Fetch all future/upcoming scheduled events
    const upcomingEvents = await db.event.findMany({
      where: {
        status: "scheduled",
        eventDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    logs.push(`Found ${upcomingEvents.length} scheduled event(s) to check.`);

    for (const event of upcomingEvents) {
      // Check if reminders already exist for this event
      const reminderCount = await db.smsReminder.count({
        where: { eventId: event.id }
      });

      if (reminderCount > 0) {
        continue;
      }

      logs.push(`Generating reminders for event ID ${event.id}: "${event.title}"`);

      // Event timezone-naive date (e.g. 2026-06-14)
      const evDate = new Date(event.eventDate);
      
      // Formatter function to create YYYY-MM-DD HH:mm:ss in Manila time
      const getReminderDateTime = (daysOffset: number, timeStr: string) => {
        const rDate = new Date(evDate);
        rDate.setDate(rDate.getDate() + daysOffset);
        const y = rDate.getFullYear();
        const m = String(rDate.getMonth() + 1).padStart(2, "0");
        const d = String(rDate.getDate()).padStart(2, "0");
        return `${y}-${m}-${d} ${timeStr}`;
      };

      // Define standard reminder windows
      const times = {
        fiveday: getReminderDateTime(-5, "17:00:00"),
        threeday: getReminderDateTime(-3, "07:00:00"),
        oneday: getReminderDateTime(-1, "17:00:00"),
        same_day: getReminderDateTime(0, "07:00:00")
      };

      // Event speaker and location sanitization
      const eventLocation = event.location ? event.location.replace(/[ññ]/g, "n").replace(/[ÑÑ]/g, "N") : "";

      // Format event date/time for template replacements
      const eventDateFormatted = new Date(event.eventDate).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      });

      // Extract hours/minutes from startTime (1970-01-01T09:30:00.000Z)
      const st = new Date(event.startTime);
      const stHours = st.getUTCHours();
      const stMinutes = st.getUTCHours() === 1970 ? st.getMinutes() : st.getUTCMinutes(); // handle double-parse offset just in case
      const ampm = stHours >= 12 ? "PM" : "AM";
      const h12 = stHours % 12 || 12;
      const mStr = String(stMinutes).padStart(2, "0");
      const eventTimeFormatted = `${h12}:${mStr} ${ampm}`;

      const eventTypeKey = event.eventType as string;
      const typeKey = TEMPLATES[eventTypeKey] ? eventTypeKey : "other";

      const reminderTypes: Array<{ type: "fiveday" | "threeday" | "oneday" | "same_day"; field: string }> = [
        { type: "fiveday", field: "sms5dayReminder" },
        { type: "threeday", field: "sms3dayReminder" },
        { type: "oneday", field: "sms1dayReminder" },
        { type: "same_day", field: "smsSameDayReminder" }
      ];

      for (const item of reminderTypes) {
        // Skip 5-day reminder for Sunday service to prevent repetitive notifications
        if (event.eventType === "sunday_service" && item.type === "fiveday") {
          continue;
        }

        let scheduledTimeStr = times[item.type];
        let scheduledDate = new Date(scheduledTimeStr);
        let useUrgent = false;

        // Auto-detect late event creation: if same-day reminder is in the past,
        // but the event starts in less than 12 hours (and is in the future),
        // we trigger an immediate 'urgent' style reminder mapped to same_day.
        if (item.type === "same_day" && scheduledDate <= manilaTime) {
          const evDate = new Date(event.eventDate);
          const eventStartManila = new Date(
            evDate.getFullYear(),
            evDate.getMonth(),
            evDate.getDate(),
            stHours,
            stMinutes
          );
          const hoursLeft = (eventStartManila.getTime() - manilaTime.getTime()) / (1000 * 60 * 60);
          if (hoursLeft > 0 && hoursLeft < 12) {
            useUrgent = true;
            // Backdate slightly (5 seconds in the past) to ensure it gets selected in the same cron run
            scheduledDate = new Date(manilaTime.getTime() - 5000);
          }
        }

        // Only schedule if reminder is in the future or we are triggering a late urgent fallback
        if (scheduledDate > manilaTime || useUrgent) {
          // Get templates & bible verse pools
          // (Urgent template falls back to same_day verse pool since there is no urgent verse pool)
          const versePool = useUrgent
            ? (BIBLE_VERSES[typeKey]?.same_day || BIBLE_VERSES.other.same_day)
            : (BIBLE_VERSES[typeKey]?.[item.type] || BIBLE_VERSES.other[item.type]);
          
          const randomVerse = versePool[Math.floor(Math.random() * versePool.length)];
          
          const template = useUrgent
            ? (TEMPLATES[typeKey]?.urgent || TEMPLATES.other.urgent)
            : (TEMPLATES[typeKey]?.[item.type] || TEMPLATES.other[item.type]);

          // Build message text (leave {name} placeholder for per-member customization)
          const message = template
            .replace(/{verse}/g, randomVerse)
            .replace(/{event_title}/g, event.title)
            .replace(/{date}/g, eventDateFormatted)
            .replace(/{time}/g, eventTimeFormatted)
            .replace(/{location}/g, eventLocation);

          await db.smsReminder.create({
            data: {
              eventId: event.id,
              reminderType: item.type,
              scheduledTime: scheduledDate,
              message: message,
              status: "pending",
            }
          });

          logs.push(`  Created ${item.type} reminder${useUrgent ? " (URGENT template)" : ""} scheduled for ${scheduledDate.toISOString()}`);
        } else {
          logs.push(`  Skipped ${item.type} reminder: scheduled time (${scheduledTimeStr}) is in the past.`);
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // Step 2: Query for due reminders to batch queue
    // ─────────────────────────────────────────────────────────────────
    
    // We execute a raw SQL query because we are comparing a timezone-naive DATETIME column
    // stored literally in Manila time with the current Manila time string.
    const dueReminders: any[] = await db.$queryRawUnsafe(`
      SELECT r.id, r.event_id, r.reminder_type, r.message, r.priority
      FROM sms_reminders r
      JOIN events e ON r.event_id = e.id
      WHERE r.status = 'pending'
        AND r.scheduled_time <= ?
        AND e.status = 'scheduled'
    `, manilaTimeStr);

    logs.push(`Found ${dueReminders.length} due reminder(s) to process.`);

    if (dueReminders.length > 0) {
      // Get all active members with a valid phone number
      // Exclude GUESTS (≤1 attendance record) — they should not receive event SMS campaigns
      const allMembers = await db.member.findMany({
        where: {
          status: { notIn: ["pending", "archived"] },
          phone: { not: null }
        },
        select: {
          id: true,
          firstName: true,
          phone: true,
          sms5dayReminder: true,
          sms3dayReminder: true,
          sms1dayReminder: true,
          smsSameDayReminder: true,
          _count: { select: { attendance: true } },
          status: true,
        }
      });

      // Filter out guests (either overridden to guest, or dynamic guests with ≤1 attendance)
      // Keep active + inactive members (or manual overrides) for re-engagement
      const members = allMembers.filter(m => {
        if (m.status === "guest") return false;
        if (m.status === "active" || m.status === "inactive") return true;
        return (m._count?.attendance ?? 0) > 1;
      });

      for (const reminder of dueReminders) {
        // Map reminder type to member opt-in field name
        let prefField: keyof typeof members[0] = "sms3dayReminder";
        switch (reminder.reminder_type) {
          case "5day":
            prefField = "sms5dayReminder";
            break;
          case "3day":
            prefField = "sms3dayReminder";
            break;
          case "1day":
            prefField = "sms1dayReminder";
            break;
          case "same_day":
            prefField = "smsSameDayReminder";
            break;
        }

        // Filter active members who opted in for this specific reminder type
        const eligibleMembers = members.filter(m => m[prefField] === true && m.phone && m.phone.trim() !== "");

        if (eligibleMembers.length === 0) {
          logs.push(`Reminder ID ${reminder.id} skipped: No active members subscribed to ${reminder.reminder_type}`);
          await db.smsReminder.update({
            where: { id: reminder.id },
            data: { status: "sent", sentAt: new Date() }
          });
          continue;
        }

        // Create CustomSmsBatch
        const batch = await db.customSmsBatch.create({
          data: {
            source: "reminder",
            status: "pending",
            priority: reminder.priority || "normal",
          }
        });

        // Insert individual recipient rows
        const recipientData = eligibleMembers.map(member => {
          const personalizedMessage = reminder.message.replace(/{name}/g, member.firstName);
          return {
            batchId: batch.id,
            memberId: member.id,
            phoneNumber: member.phone!,
            personalizedMessage: personalizedMessage,
            sendStatus: "pending" as any,
          };
        });

        await db.customSmsBatchRecipient.createMany({
          data: recipientData
        });

        // Update SmsReminder status to sent/queued
        await db.smsReminder.update({
          where: { id: reminder.id },
          data: {
            status: "sent",
            sentAt: new Date(),
            batchStatus: "pending",
            batchGroup: String(batch.id),
          }
        });

        logs.push(`Reminder ID ${reminder.id} batched successfully: Queued ${eligibleMembers.length} messages in Batch ID ${batch.id}.`);
      }
    }

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error("Error in POST /api/sms/reminders/check:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
