import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = parseInt(id);

  try {
    const comments = await db.comment.findMany({
      where: { postId },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(comments);
  } catch (error) {
    console.error("[api/posts/[id]/comments GET]", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id);

  try {
    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const comment = await db.comment.create({
      data: {
        postId,
        authorId: session.user.id as unknown as number,
        content: content.trim(),
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("[api/posts/[id]/comments POST]", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
