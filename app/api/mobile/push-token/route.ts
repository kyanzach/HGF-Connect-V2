import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const TOKENS_FILE = path.join(process.cwd(), "data", "mobile_push_tokens.json");

export interface StoredPushToken {
  memberId: number;
  token: string;
  platform: string;
  updatedAt: string;
}

export async function readPushTokens(): Promise<StoredPushToken[]> {
  try {
    const raw = await fs.readFile(TOKENS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePushTokens(tokens: StoredPushToken[]) {
  const dir = path.dirname(TOKENS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf8");
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedMember(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const token = String(body.token || "").trim();
    const platform = String(body.platform || "unknown").trim();

    if (!token) {
      return NextResponse.json({ error: "Push token is required." }, { status: 400 });
    }

    const existing = await readPushTokens();
    const filtered = existing.filter((t) => t.token !== token);
    filtered.push({
      memberId: authUser.id,
      token,
      platform,
      updatedAt: new Date().toISOString(),
    });

    await writePushTokens(filtered);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/mobile/push-token]", err);
    return NextResponse.json({ error: "Failed to register push token" }, { status: 500 });
  }
}
