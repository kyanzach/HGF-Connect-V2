import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPresentationDownloadFilename } from "@/lib/presentationUtils";
import path from "path";
import fs from "fs";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to download sermon resources." },
        { status: 401 }
      );
    }

    if ((session.user as any).status === "pending") {
      return NextResponse.json(
        { error: "Forbidden. Account approval required to download sermon resources." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        commentary: true,
        presentationFile: true,
        presentationOriginalName: true,
      },
    });

    if (!event || !event.presentationFile) {
      return NextResponse.json({ error: "Presentation file not found" }, { status: 404 });
    }

    const relativePath = event.presentationFile.startsWith("/")
      ? event.presentationFile.slice(1)
      : event.presentationFile;
    const absolutePath = path.join(process.cwd(), "public", relativePath);

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ error: "Presentation file not found on disk" }, { status: 404 });
    }

    const stat = await fs.promises.stat(absolutePath);
    const finalFilename = getPresentationDownloadFilename(event);
    const asciiFilename = finalFilename.replace(/[^\x20-\x7E]/g, "_");
    const isPdf = event.presentationFile.toLowerCase().endsWith(".pdf");
    const contentType = isPdf
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    const nodeStream = fs.createReadStream(absolutePath);
    const webStream = Readable.toWeb(nodeStream);

    return new Response(webStream as any, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error("Error downloading presentation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
