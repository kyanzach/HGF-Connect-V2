import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/marketplace/love-gifts — sharer's earnings
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shares = await db.listingShare.findMany({
    where: { sharerId: parseInt(session.user.id) },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: { id: true, title: true, price: true, loveGiftPercent: true },
      },
    },
  });

  const totalEarned = shares.reduce((acc: number, s: typeof shares[0]) => acc + Number(s.loveGiftEarned), 0);

  return NextResponse.json({ shares, totalEarned });
}
