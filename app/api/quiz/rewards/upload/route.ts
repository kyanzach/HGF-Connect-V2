import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { processImage } from "@/lib/processImage";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: jpg, png, webp, gif" }, { status: 400 });
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    const filename = `${randomUUID()}.webp`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "rewards");
    await mkdir(uploadDir, { recursive: true });

    // Process image buffer using our Sharp pipeline -> convert to WebP
    const arrayBuffer = await file.arrayBuffer();
    const processed = await processImage(Buffer.from(arrayBuffer), "listing");

    await writeFile(path.join(uploadDir, filename), processed.buffer);

    return NextResponse.json({ photoPath: `rewards/${filename}` });
  } catch (error: any) {
    console.error("[api/quiz/rewards/upload]", error?.message);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
