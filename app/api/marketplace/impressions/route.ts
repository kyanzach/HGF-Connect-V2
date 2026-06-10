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
    const userAgent = req.headers.get("user-agent") || null;

    let country = null;
    let region = null;
    let city = null;
    let ipAddress = null;

    if (ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1" && !ip.startsWith("192.168.") && !ip.startsWith("10.")) {
      ipAddress = ip;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const geoRes = await fetch(`http://ip-api.com/json/${ip}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.status === "success") {
            country = geoData.country || null;
            region = geoData.regionName || null;
            city = geoData.city || null;
          }
        }
      } catch (err) {
        console.error("Geo lookup failed in route:", err);
      }
    }

    // Fire-and-forget — never block the UI
    await db.marketplaceImpression.create({
      data: {
        listingId: parseInt(listingId),
        shareCode: shareCode ?? null,
        event,
        ipHash,
        ipAddress,
        country,
        region,
        city,
        userAgent,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
