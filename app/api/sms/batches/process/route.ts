import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/sms";

// POST /api/sms/batches/process — Secure cron endpoint to process pending SMS batches
export async function POST(request: NextRequest) {
  const secretHeader = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs: string[] = [];
    const BATCH_SIZE = 10;
    const currentTime = new Date();

    // Step 0: Reset stuck processing batches (older than 10 minutes)
    const tenMinutesAgo = new Date(currentTime.getTime() - 10 * 60 * 1000);
    const resetResult = await db.customSmsBatch.updateMany({
      where: {
        status: "processing",
        updatedAt: { lte: tenMinutesAgo },
      },
      data: {
        status: "pending",
      },
    });

    if (resetResult.count > 0) {
      logs.push(`Reset ${resetResult.count} stuck processing batches back to pending.`);
    }

    // Step 1: Find next pending or processing batch
    const batch = await db.customSmsBatch.findFirst({
      where: {
        status: { in: ["pending", "processing"] },
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "asc" },
      ],
      include: {
        recipients: {
          where: { sendStatus: "pending" },
          orderBy: { id: "asc" },
          take: BATCH_SIZE,
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ success: true, message: "No pending or processing batches found.", logs });
    }

    logs.push(`Found batch ID ${batch.id} (Source: ${batch.source}, Priority: ${batch.priority}) with ${batch.recipients.length} pending recipients.`);

    // If batch has no pending recipients left, mark as completed
    if (batch.recipients.length === 0) {
      await db.customSmsBatch.update({
        where: { id: batch.id },
        data: { status: "completed" },
      });
      logs.push(`Batch ID ${batch.id} marked as completed (no pending recipients).`);
      return NextResponse.json({ success: true, message: `Batch ${batch.id} completed.`, logs });
    }

    // Step 2: Mark batch as processing if it is pending
    if (batch.status === "pending") {
      await db.customSmsBatch.update({
        where: { id: batch.id },
        data: { status: "processing" },
      });
    }

    const batchStartTime = Date.now();
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    // Step 3: Process each recipient
    for (const recipient of batch.recipients) {
      if (!recipient.phoneNumber) {
        await db.customSmsBatchRecipient.update({
          where: { id: recipient.id },
          data: {
            sendStatus: "failed",
            errorMessage: "Missing phone number",
          },
        });
        skippedCount++;
        continue;
      }

      // Send the SMS (using our central sendSms helper)
      const result = await sendSms(
        recipient.phoneNumber,
        recipient.personalizedMessage,
        recipient.memberId || undefined,
        undefined, // reminderId
        undefined // let getSenderId resolve the sender ID dynamically
      );

      if (result.success) {
        await db.customSmsBatchRecipient.update({
          where: { id: recipient.id },
          data: {
            sendStatus: "sent",
            sentAt: new Date(),
            errorMessage: null,
          },
        });
        successCount++;
      } else {
        await db.customSmsBatchRecipient.update({
          where: { id: recipient.id },
          data: {
            sendStatus: "failed",
            errorMessage: result.error || "Failed to send SMS",
            retryCount: { increment: 1 },
          },
        });
        failCount++;
      }

      // Add a 1 second delay between messages (as in legacy PHP script)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Step 4: Check if batch is completely finished (no more pending recipients in the entire database for this batch)
    const remainingPendingCount = await db.customSmsBatchRecipient.count({
      where: {
        batchId: batch.id,
        sendStatus: "pending",
      },
    });

    const isBatchCompleted = remainingPendingCount === 0;
    if (isBatchCompleted) {
      await db.customSmsBatch.update({
        where: { id: batch.id },
        data: { status: "completed" },
      });
      logs.push(`Batch ID ${batch.id} completed. All recipients processed.`);
    } else {
      // Set status back to pending so it can be picked up in the next cron run
      await db.customSmsBatch.update({
        where: { id: batch.id },
        data: { status: "pending" },
      });
      logs.push(`Batch ID ${batch.id} set back to pending with ${remainingPendingCount} remaining recipients.`);
    }

    // Step 5: Update stats in sms_batch_stats table
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day local date
    const processingTime = ((Date.now() - batchStartTime) / 1000).toFixed(2);

    try {
      await db.smsBatchStat.upsert({
        where: { date: today },
        update: {
          totalSent: { increment: successCount },
          totalFailed: { increment: failCount },
          batchesProcessed: { increment: 1 },
          totalProcessingTime: { increment: parseFloat(processingTime) },
        },
        create: {
          date: today,
          totalSent: successCount,
          totalFailed: failCount,
          batchesProcessed: 1,
          totalProcessingTime: parseFloat(processingTime),
        },
      });
    } catch (statErr: any) {
      console.error("Failed to update sms_batch_stats:", statErr.message);
    }

    return NextResponse.json({
      success: true,
      processed: batch.recipients.length,
      successCount,
      failCount,
      skippedCount,
      isBatchCompleted,
      logs,
    });
  } catch (error: any) {
    console.error("Error in POST /api/sms/batches/process:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
