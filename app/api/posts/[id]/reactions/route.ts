import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const postId = parseInt(id);

  try {
    const reactions = await (db as any).postLike.findMany({
      where: { postId },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(reactions);
  } catch (error) {
    console.error("[api/posts/[id]/reactions]", error);
    return NextResponse.json({ error: "Failed to fetch reactions" }, { status: 500 });
  }
}
