import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/groups/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const group = await db.group.findUnique({
    where: { id },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      members: {
        take: 20,
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          role: true,
          member: {
            select: { id: true, firstName: true, lastName: true, profilePicture: true },
          },
        },
      },
      _count: { select: { members: true } },
    },
  });

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let isMember = false;
  if (session?.user?.id) {
    const membership = await db.groupMember.findUnique({
      where: { groupId_memberId: { groupId: id, memberId: parseInt(session.user.id) } },
    });
    isMember = !!membership;
  }

  return NextResponse.json({ group, isMember });
}
