import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import sharp from "sharp";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ filename: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const { filename } = await params;

  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return new NextResponse("Invalid filename", { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "marketplace");
  const webpPath = path.join(uploadDir, filename);

  if (!fs.existsSync(webpPath)) {
    return new NextResponse("Image not found", { status: 404 });
  }

  try {
    const webpBuffer = await fs.promises.readFile(webpPath);
    // Convert WebP to JPEG on-the-fly via sharp
    const jpegBuffer = await sharp(webpBuffer)
      .jpeg({ quality: 85 })
      .toBuffer();

    const headers = new Headers();
    headers.set("Content-Type", "image/jpeg");
    headers.set("Content-Length", String(jpegBuffer.length));
    // Cache for 30 days
    headers.set("Cache-Control", "public, max-age=2592000, immutable");

    return new NextResponse(new Uint8Array(jpegBuffer), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error converting WebP to JPEG:", error);
    return new NextResponse("Error processing image", { status: 500 });
  }
}
