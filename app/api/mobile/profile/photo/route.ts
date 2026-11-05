import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { processImage } from "@/lib/processImage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = (formData.get("photo") || formData.get("file")) as File | null;
    if (!file) {
      return NextResponse.json({ success: false, message: "No photo file provided." }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const { buffer, thumb } = await processImage(rawBuffer, "profile");

    const ts = Date.now();
    const uploadDir = path.join(process.cwd(), "public", "uploads", "profile_pictures");
    await mkdir(uploadDir, { recursive: true });

    const fullName = `${member.id}_profile_${ts}.webp`;
    await writeFile(path.join(uploadDir, fullName), buffer);

    let thumbName: string | null = null;
    if (thumb) {
      thumbName = `${member.id}_profile_thumb_${ts}.webp`;
      await writeFile(path.join(uploadDir, thumbName), thumb);
    }

    await db.member.update({
      where: { id: member.id },
      data: {
        profilePicture: fullName,
        profilePictureThumbnail: thumbName,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        profilePicture: `https://connect.houseofgrace.ph/uploads/profile_pictures/${fullName}`,
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/profile/photo POST]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to upload photo." }, { status: 500 });
  }
}
