import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/groups — list all groups
export async function GET() {
  const groups = await db.group.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      isPrivate: true,
      createdBy: { select: { firstName: true, lastName: true } },
      _count: { select: { members: true } },
    },
  });
  return NextResponse.json({ groups });
}

// POST /api/groups — create a group
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, category, isPrivate } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const group = await db.group.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      category: category || "General",
      isPrivate: isPrivate ?? false,
      createdById: parseInt(session.user.id),
      members: {
        create: { memberId: parseInt(session.user.id), role: "admin" },
      },
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}
