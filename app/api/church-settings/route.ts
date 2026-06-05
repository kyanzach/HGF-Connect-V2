import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/church-settings
 * Restricted to admins and moderators. Returns all key-value settings.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify role
  const member = await db.member.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { role: true },
  });
  if (!member || !["admin", "moderator"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settingsList = await db.churchSetting.findMany();
  const settingsObj = settingsList.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);

  return NextResponse.json(settingsObj);
}

/**
 * POST /api/church-settings
 * Restricted to admins and moderators. Upserts settings.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify role
  const member = await db.member.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { role: true },
  });
  if (!member || !["admin", "moderator"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Upsert all keys
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        await db.churchSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[api/church-settings]", (err as Error).message);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
