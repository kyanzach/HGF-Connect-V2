import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { processPresentation, ProcessedPresentation } from "@/lib/presentationProcessor";

export const dynamic = "force-dynamic";

interface Job {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  error?: string;
  result?: ProcessedPresentation;
}

// In-memory jobs cache (persisted across requests inside the PM2 process lifecycle)
const JOBS: Record<string, Job> = {};

// GET /api/events/presentation/upload?jobId=xxx — Check background job status
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const job = JOBS[jobId];
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}

// POST /api/events/presentation/upload — Upload presentation file and start optimization
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only allow admin, moderator, usher
  const allowed = ["admin", "moderator", "usher"];
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file extension
    const ext = path.extname(file.name).toLowerCase();
    if (ext !== ".pdf" && ext !== ".pptx") {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and PPTX are allowed." },
        { status: 400 }
      );
    }

    // Validate size (max 500MB as specified by the user)
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 500MB." }, { status: 400 });
    }

    // Save uploaded file to local temp directory
    const tempDir = path.join(process.cwd(), "tmp");
    await mkdir(tempDir, { recursive: true });
    
    const tempFilename = `${randomUUID()}${ext}`;
    const tempFilePath = path.join(tempDir, tempFilename);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFilePath, buffer);

    // Initialize background job entry
    const jobId = randomUUID();
    const job: Job = {
      id: jobId,
      status: "pending",
      progress: 5,
      message: "File uploaded, starting processor...",
    };
    JOBS[jobId] = job;

    // Trigger presentation optimization asynchronously
    // We intentionally do NOT await this promise to respond to the client immediately
    void (async () => {
      job.status = "processing";
      try {
        const result = await processPresentation(
          tempFilePath,
          file.name,
          (progress, message) => {
            job.progress = progress;
            job.message = message;
          }
        );
        job.status = "completed";
        job.result = result;
      } catch (err: any) {
        console.error(`Presentation processing error (job ${jobId}):`, err);
        job.status = "failed";
        job.message = "Failed to process presentation";
        job.error = err?.message || "Unknown error";
      }
    })();

    return NextResponse.json({ success: true, jobId });
  } catch (error: any) {
    console.error("Error in POST /api/events/presentation/upload:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
