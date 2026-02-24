import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { processImage } from "@/lib/processImage";

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB input — Sharp will compress output to <120 KB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const isAdmin = ["admin", "moderator"].includes(session.user.role ?? "");
  const isSelf = session.user.id === String(id);

  if (!isAdmin && !isSelf) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) ?? "profile";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_MIME.includes(file.type.toLowerCase())) {
    return NextResponse.json({ error: "Invalid file type. Use JPG, PNG, WebP, or HEIC." }, { status: 400 });
  }
  if (file.type === "image/gif") {
    return NextResponse.json({ error: "GIF not supported for profile photos." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  const purpose = type === "cover" ? "cover" : "profile";
  const rawBuffer = Buffer.from(await file.arrayBuffer());

  // ✅ Convert to WebP via Sharp
  const { buffer, thumb } = await processImage(rawBuffer, purpose);

  const ts = Date.now();
  const subDir = purpose === "cover" ? "cover_photos" : "profile_pictures";
  const uploadDir = path.join(process.cwd(), "public", "uploads", subDir);
  await mkdir(uploadDir, { recursive: true });

  const fullName = `${id}_${purpose}_${ts}.webp`;
  await writeFile(path.join(uploadDir, fullName), buffer);

  // Save thumbnail alongside full image (profile only)
  let thumbName: string | null = null;
  if (thumb) {
    thumbName = `${id}_profile_thumb_${ts}.webp`;
    await writeFile(path.join(uploadDir, thumbName), thumb);
  }

  // ── Archive current photo to history BEFORE overwriting ──────────────────
  const current = await (db as any).member.findUnique({
    where: { id },
    select: { profilePicture: true, profilePictureThumbnail: true, coverPhoto: true },
  });
  const prevName  = purpose === "cover" ? current?.coverPhoto       : current?.profilePicture;
  const prevThumb = purpose === "profile" ? current?.profilePictureThumbnail as string | null ?? null : null;
  if (prevName) {
    await (db as any).memberPhotoHistory.create({
      data: { memberId: id, type: purpose, fileName: prevName, thumbName: prevThumb ?? null },
    });
    // Prune: keep newest 30 per type
    const old = await (db as any).memberPhotoHistory.findMany({
      where: { memberId: id, type: purpose },
      orderBy: { createdAt: "desc" },
      skip: 30, select: { id: true },
    });
    if (old.length) {
      await (db as any).memberPhotoHistory.deleteMany({ where: { id: { in: old.map((r: any) => r.id) } } });
    }
  }

  const updateData: Record<string, string | null> =
    purpose === "cover"
      ? { coverPhoto: fullName }
      : { profilePicture: fullName, profilePictureThumbnail: thumbName };

  await db.member.update({ where: { id }, data: updateData });

  return NextResponse.json({
    success: true,
    path: `/uploads/${subDir}/${fullName}`,
    thumbPath: thumbName ? `/uploads/${subDir}/${thumbName}` : null,
    fileName: fullName,
  });
}
