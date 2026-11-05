import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const [members, ministries, submissions] = await Promise.all([
      db.member.findMany({
        where: {
          status: { in: ["active", "approved"] },
          ...(q
            ? {
                OR: [
                  { firstName: { contains: q } },
                  { lastName: { contains: q } },
                  { username: { contains: q } },
                ],
              }
            : {}),
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        take: 60,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          role: true,
          type: true,
          profilePicture: true,
          favoriteVerse: true,
          ministries: {
            where: { status: "active" },
            include: {
              ministry: { select: { id: true, name: true } },
            },
          },
        },
      }),
      db.ministry.findMany({
        where: { status: "active" },
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              members: { where: { status: "active" } },
            },
          },
        },
      }),
      (db as any).quizSubmission
        .findMany({
          take: 200,
          orderBy: { totalScore: "desc" },
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePicture: true,
                status: true,
              },
            },
          },
        })
        .catch(() => []),
    ]);

    // Aggregate quiz leaderboard by member
    const scoreMap = new Map<
      number,
      { id: number; name: string; avatar: string | null; totalScore: number; quizzesTaken: number }
    >();
    for (const sub of submissions) {
      if (!sub.member || !["active", "approved"].includes(sub.member.status)) continue;
      const mId = sub.member.id;
      const existing = scoreMap.get(mId) || {
        id: mId,
        name: `${sub.member.firstName} ${sub.member.lastName}`.trim(),
        avatar: sub.member.profilePicture
          ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${sub.member.profilePicture}`
          : null,
        totalScore: 0,
        quizzesTaken: 0,
      };
      existing.totalScore += Number(sub.totalScore || 0);
      existing.quizzesTaken += 1;
      scoreMap.set(mId, existing);
    }

    const leaderboard = Array.from(scoreMap.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 15);

    return NextResponse.json({
      success: true,
      data: {
        directory: members.map((m) => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`.trim(),
          username: m.username,
          role: m.role,
          type: m.type,
          favoriteVerse: m.favoriteVerse,
          avatar: m.profilePicture
            ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${m.profilePicture}`
            : null,
          ministries: m.ministries.map((mm) => mm.ministry.name),
        })),
        ministries: ministries.map((min) => ({
          id: min.id,
          name: min.name,
          description: min.description || "Serving the House of Grace Fellowship family.",
          memberCount: min._count.members,
        })),
        leaderboard,
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/church GET]", err?.message);
    return NextResponse.json(
      { success: false, message: "Failed to load church hub" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const body = await req.json();
    const prompt = String(body?.prompt || "").trim();

    if (!prompt) {
      return NextResponse.json(
        { success: false, message: "Please enter a question or topic." },
        { status: 400 }
      );
    }

    // Use OpenAI if configured, with curated pastoral fallback
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Grace AI, the warm, Scripture-grounded pastoral assistant for House of Grace Fellowship (HGF Connect) in General Santos City. Keep answers concise (2-3 short paragraphs), encouraging, and include a relevant Bible verse.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 320,
        }),
      }).catch(() => null);

      if (aiRes && aiRes.ok) {
        const json = await aiRes.json();
        const reply = json?.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return NextResponse.json({
            success: true,
            data: { reply },
          });
        }
      }
    }

    const nameGreeting = member ? `Hello ${member.firstName}! ` : "Grace and peace to you! ";
    return NextResponse.json({
      success: true,
      data: {
        reply: `${nameGreeting}Thank you for reaching out about "${prompt}". Remember God's promise in Philippians 4:6-7: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."`,
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/church POST]", err?.message);
    return NextResponse.json(
      { success: false, message: "Failed to process request" },
      { status: 500 }
    );
  }
}
