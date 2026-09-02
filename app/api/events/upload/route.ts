import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { processImage } from "@/lib/processImage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate file type (supports PNG, JPG, WebP, GIF, HEIC/HEIF, BMP, TIFF from Canva/Design tools)
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/bmp",
    "image/tiff",
  ];
  if (!allowed.includes(file.type) && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid file type. Please upload a valid image (PNG, JPG, WebP, etc.)." }, { status: 400 });
  }

  // Validate file size (100MB)
  const MAX_SIZE = 100 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum allowed size is 100MB." }, { status: 400 });
  }

  try {
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    
    // Process image into high-resolution compressed WebP (max 1920px wide, quality 85)
    // The giant Canva PNG remains in memory and is automatically discarded; only the WebP is saved.
    const { buffer: webpBuffer } = await processImage(rawBuffer, "event_cover");
    
    const filename = `${randomUUID()}.webp`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "events");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), webpBuffer);

    return NextResponse.json({ photoPath: filename });
  } catch (error: any) {
    console.error("Error processing event cover upload:", error);
    return NextResponse.json({ error: "Failed to process and optimize image." }, { status: 500 });
  }
}
