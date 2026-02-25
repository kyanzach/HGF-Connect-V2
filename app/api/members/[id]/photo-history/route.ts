import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };
const subDir = (type: string) => type === "cover" ? "cover_photos" : "profile_pictures";

// ── GET /api/members/[id]/photo-history?type=profile|cover ───────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (session.user.id !== String(id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const type = req.nextUrl.searchParams.get("type") === "cover" ? "cover" : "profile";

  const history = await (db as any).memberPhotoHistory.findMany({
    where: { memberId: id, type },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, fileName: true, thumbName: true, createdAt: true, type: true, postId: true, caption: true },
  });

  return NextResponse.json(
    history.map((h: any) => ({
      id:        h.id,
      type:      h.type,
      fileName:  h.fileName,
      thumbName: h.thumbName,
      url:       `/uploads/${subDir(h.type)}/${h.fileName}`,
      thumbUrl:  h.thumbName ? `/uploads/profile_pictures/${h.thumbName}` : null,
      postId:    h.postId ?? null,
      caption:   h.caption ?? null,
      createdAt: h.createdAt,
    }))
  );
}

// ── PATCH /api/members/[id]/photo-history { historyId, caption, type? } ── edit caption
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (session.user.id !== String(id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { historyId, caption, type: photoType } = await req.json();
  const ptype = photoType === "cover" ? "cover" : "profile";

  let entry: any = null;

  // If historyId is valid (> 0), look it up directly
  if (historyId && historyId > 0) {
    entry = await (db as any).memberPhotoHistory.findFirst({
      where: { id: historyId, memberId: id },
    });
  }

  // If entry still not found (historyId=-1 or missing), find/create from current photo
  if (!entry) {
    const member = await (db as any).member.findUnique({
      where: { id },
      select: { profilePicture: true, profilePictureThumbnail: true, coverPhoto: true },
    });
    const currentFileName = ptype === "cover" ? member?.coverPhoto : member?.profilePicture;
    if (!currentFileName) return NextResponse.json({ error: "No current photo" }, { status: 404 });

    // Find existing history row for this file
    entry = await (db as any).memberPhotoHistory.findFirst({
      where: { memberId: id, type: ptype, fileName: currentFileName },
      orderBy: { createdAt: "desc" },
    });

    // Create one if it doesn't exist yet
    if (!entry) {
      entry = await (db as any).memberPhotoHistory.create({
        data: {
          memberId: id,
          type: ptype,
          fileName: currentFileName,
          thumbName: ptype === "profile" ? ((member as any)?.profilePictureThumbnail ?? null) : null,
          caption: null,
        },
      });
    }
  }

  // Save caption on history row
  await (db as any).memberPhotoHistory.update({
    where: { id: entry.id },
    data: { caption: caption ?? null },
  });

  // Also update the linked Post content if it exists
  if (entry.postId) {
    await (db as any).post.update({
      where: { id: entry.postId },
      data: { content: caption ?? null },
    });
  }

  return NextResponse.json({ ok: true, historyId: entry.id });
}

// ── POST /api/members/[id]/photo-history { historyId } ─── restore ───────────
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (session.user.id !== String(id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { historyId } = await req.json();
  if (!historyId) return NextResponse.json({ error: "historyId required" }, { status: 400 });

  const entry = await (db as any).memberPhotoHistory.findFirst({
    where: { id: historyId, memberId: id },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Before restoring, archive the current photo
  const current = await (db as any).member.findUnique({
    where: { id },
    select: { profilePicture: true, profilePictureThumbnail: true, coverPhoto: true },
  });
  const prevName  = entry.type === "cover" ? current?.coverPhoto : current?.profilePicture;
  const prevThumb = entry.type === "profile" ? current?.profilePictureThumbnail as string | null ?? null : null;
  if (prevName) {
    await (db as any).memberPhotoHistory.create({
      data: { memberId: id, type: entry.type, fileName: prevName, thumbName: prevThumb ?? null },
    });
    const old = await (db as any).memberPhotoHistory.findMany({
      where: { memberId: id, type: entry.type },
      orderBy: { createdAt: "desc" },
      skip: 30, select: { id: true },
    });
    if (old.length) await (db as any).memberPhotoHistory.deleteMany({ where: { id: { in: old.map((r: any) => r.id) } } });
  }

  const updateData =
    entry.type === "cover"
      ? { coverPhoto: entry.fileName }
      : { profilePicture: entry.fileName, profilePictureThumbnail: entry.thumbName ?? null };

  await db.member.update({ where: { id }, data: updateData });

  return NextResponse.json({
    ok: true,
    url: `/uploads/${subDir(entry.type)}/${entry.fileName}`,
    thumbUrl: entry.thumbName ? `/uploads/profile_pictures/${entry.thumbName}` : null,
    fileName: entry.fileName,
  });
}
