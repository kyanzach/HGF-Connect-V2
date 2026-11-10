import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "hgf-connect-mobile-secret-2026";

export interface MobileTokenPayload {
  id: number;
  role: string;
  status: string;
  iat: number;
  exp: number;
}

export function signMobileToken(member: { id: number; role: string; status: string }): string {
  const payload: MobileTokenPayload = {
    id: member.id,
    role: member.role,
    status: member.status,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 1 year
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyMobileToken(token: string): MobileTokenPayload | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expectedSig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as MobileTokenPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getAuthenticatedMember(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const queryToken = req.nextUrl?.searchParams?.get("token") || null;
  const rawToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : queryToken;

  if (rawToken) {
    const payload = verifyMobileToken(rawToken);
    if (payload?.id) {
      const member = await db.member.findUnique({
        where: { id: Number(payload.id) },
      });
      if (member && member.status !== "archived") {
        return member;
      }
    }
  }

  const session = await auth().catch(() => null);
  if (session?.user?.id) {
    const member = await db.member.findUnique({
      where: { id: Number(session.user.id) },
    });
    if (member && member.status !== "archived") {
      return member;
    }
  }
  return null;
}
