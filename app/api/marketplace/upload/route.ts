import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { processImage } from "@/lib/processImage";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB input
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// POST /api/marketplace/upload — upload listing photo (→ WebP)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Use JPG, PNG, or WebP." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large. Max 10 MB." }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());

    // ✅ Convert to WebP via Sharp (max 1200px wide, preserve aspect)
    const { buffer } = await processImage(rawBuffer, "listing");

    const filename = `${randomBytes(8).toString("hex")}.webp`;
    const uploadDir = join(process.cwd(), "public", "uploads", "marketplace");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);

    return NextResponse.json({ photoPath: filename });
  } catch (err) {
    console.error("[marketplace/upload]", (err as Error).message);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
