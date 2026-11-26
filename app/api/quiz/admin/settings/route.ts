/**
 * GET / POST /api/quiz/admin/settings
 *
 * GET  (authenticated): returns { dripEnabled: boolean }
 * POST (pastor/admin):  updates { dripEnabled: boolean } in church_settings
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isQuizDripEnabled, setQuizDripEnabled } from "@/lib/quiz-settings";

export const dynamic = "force-dynamic";

async function isPastorOrAdmin(session: any): Promise<boolean> {
  const role = session?.user?.role;
  if (role === "admin" || role === "moderator") return true;

  const memberId = parseInt(session?.user?.id, 10);
  if (isNaN(memberId)) return false;

  const pm = await db.memberMinistry.findFirst({
    where: { memberId, ministryId: 11, status: "active" },
  });
  return !!pm;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dripEnabled = await isQuizDripEnabled();
  return NextResponse.json({ dripEnabled });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authorized = await isPastorOrAdmin(session);
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const dripEnabled = Boolean(body?.dripEnabled);
    await setQuizDripEnabled(dripEnabled);
    return NextResponse.json({ success: true, dripEnabled });
  } catch (error: any) {
    console.error("[api/quiz/admin/settings]", error?.message);
    return NextResponse.json({ error: "Failed to update quiz settings" }, { status: 500 });
  }
}
