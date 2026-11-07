import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { processImage } from "@/lib/processImage";

export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const ALLOWED_FOLDERS = ["posts", "marketplace", "events", "testimonies"] as const;

export async function POST(req: NextRequest) {
  const member = await getAuthenticatedMember(req);
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const rawFolder = searchParams.get("folder") || "posts";
    const folder = ALLOWED_FOLDERS.includes(rawFolder as any) ? rawFolder : "posts";

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.type && !ALLOWED_MIME.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPG, PNG, or WebP." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large. Max 20 MB." }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const preset = folder === "events" ? "cover" : "listing";
    const { buffer } = await processImage(rawBuffer, preset);

    const filename = `${randomBytes(8).toString("hex")}.webp`;
    const uploadDir = join(process.cwd(), "public", "uploads", folder);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);

    return NextResponse.json({
      success: true,
      photoPath: filename,
      url: `https://connect.houseofgrace.ph/uploads/${folder}/${filename}`,
    });
  } catch (err) {
    console.error("[api/mobile/posts/upload]", (err as Error).message);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
