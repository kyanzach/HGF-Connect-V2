import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const ministries = await db.ministry.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json({ ministries });
}
