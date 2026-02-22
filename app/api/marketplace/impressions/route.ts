import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

// POST /api/marketplace/impressions — log impression or CTA click events (v1.1 §77)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { listingId, shareCode, event } = body;

    if (!listingId || !event) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const validEvents = ["impression", "reveal_click", "contact_click"];
    if (!validEvents.includes(event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const forwarded = req.headers.get("x-forwarded-for") ?? "unknown";
    const ip = forwarded.split(",")[0].trim();
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    // Fire-and-forget — never block the UI
    await db.marketplaceImpression.create({
      data: {
        listingId: parseInt(listingId),
        shareCode: shareCode ?? null,
        event,
        ipHash,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
