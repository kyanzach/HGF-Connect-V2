import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST /api/groups/[id]/join
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const groupId = parseInt(id);
  if (isNaN(groupId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  // Check group exists
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  // Upsert membership
  await db.groupMember.upsert({
    where: { groupId_memberId: { groupId, memberId: parseInt(session.user.id) } },
    update: {},
    create: { groupId, memberId: parseInt(session.user.id), role: "member" },
  });

  return NextResponse.json({ success: true });
}
