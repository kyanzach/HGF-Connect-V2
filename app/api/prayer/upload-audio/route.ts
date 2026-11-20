import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_EXTS = new Set(["webm", "mp4", "m4a", "ogg", "aac", "wav", "mp3"]);

function resolveAudioExt(file: File): string | null {
  const mime = (file.type || "").toLowerCase().split(";")[0].trim();
  const mimeMap: Record<string, string> = {
    "audio/webm": "webm",
    "video/webm": "webm",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/m4a": "m4a",
    "audio/aac": "aac",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/3gpp": "m4a",
    "audio/3gpp2": "m4a",
  };

  if (mime && mimeMap[mime]) {
    return mimeMap[mime];
  }

  const rawExt = file.name?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  if (ALLOWED_EXTS.has(rawExt)) {
    return rawExt;
  }

  // Some mobile/Safari recordings send empty or application/octet-stream MIME with valid ext
  if (!mime || mime === "application/octet-stream") {
    return "m4a";
  }

  return null;
}

export async function POST(request: NextRequest) {
  // Support both Web NextAuth session and Mobile Bearer JWT
  let userId: string | number | null = null;
  let userStatus: string | undefined;

  const session = await auth();
  if (session?.user?.id) {
    userId = session.user.id;
    userStatus = session.user.status;
  } else {
    const mobileMember = await getAuthenticatedMember(request);
    if (mobileMember) {
      userId = mobileMember.id;
      userStatus = mobileMember.status;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (userStatus === "pending" || userStatus === "archived") {
    return NextResponse.json({ error: "Account not active" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File | null;
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Recorded audio is empty" }, { status: 400 });
    }

    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Audio file too large (max 5MB)" }, { status: 400 });
    }

    const ext = resolveAudioExt(file);
    if (!ext) {
      return NextResponse.json({ error: "Unsupported audio format" }, { status: 400 });
    }

    const safeUserId = String(userId).replace(/[^0-9a-zA-Z]/g, "");
    const filename = `prayer_${safeUserId}_${Date.now()}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "prayer_audio");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/prayer_audio/${filename}` });
  } catch (error) {
    console.error("[api/prayer/upload-audio]", error);
    return NextResponse.json({ error: "Audio upload failed" }, { status: 500 });
  }
}
