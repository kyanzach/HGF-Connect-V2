import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function isPastorOrAdmin(session: any): Promise<boolean> {
  const role = session?.user?.role;
  if (role === "admin") return true;

  const memberId = parseInt(session?.user?.id, 10);
  if (isNaN(memberId)) return false;

  const pm = await db.memberMinistry.findFirst({
    where: { memberId, ministryId: 11, status: "active" },
  });
  return !!pm;
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorized = await isPastorOrAdmin(session);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const quizzes = await db.sermonQuiz.findMany({
      orderBy: { sermonDate: "desc" },
      include: {
        creator: { select: { firstName: true, lastName: true } },
        _count: { select: { questions: true, submissions: true, rewards: true } },
      },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(quizzes)));
  } catch (error: any) {
    console.error("[api/quiz/admin/list]", error?.message);
    return NextResponse.json({ error: "Failed to list quizzes" }, { status: 500 });
  }
}
