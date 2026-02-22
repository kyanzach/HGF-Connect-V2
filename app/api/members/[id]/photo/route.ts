import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

  const sizeLimit = 5 * 1024 * 1024; // 5 MB
  if (file.size > sizeLimit) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  if (!["jpg", "jpeg", "png", "webp"].includes(ext))
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });

  const fileName = `${id}_${type}_${Date.now()}.${ext}`;
  const subDir = type === "cover" ? "cover_photos" : "profile_pictures";
  const uploadDir = path.join(process.cwd(), "public", "uploads", subDir);

  await mkdir(uploadDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes));

  const updateData = type === "cover"
    ? { coverPhoto: fileName }
    : { profilePicture: fileName };

  await db.member.update({ where: { id }, data: updateData });

  return NextResponse.json({
    success: true,
    path: `/uploads/${subDir}/${fileName}`,
    fileName,
  });
}
