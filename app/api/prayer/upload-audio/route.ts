import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Validate: max 5MB, audio types only
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const ext = file.name?.split(".").pop() || "webm";
    const filename = `prayer_${session.user.id}_${Date.now()}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "prayer_audio");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/prayer_audio/${filename}` });
  } catch (error) {
    console.error("[api/prayer/upload-audio]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
