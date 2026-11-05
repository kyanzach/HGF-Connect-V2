/**
 * lib/notify.ts — Shared notification helper (In-App DB + Native Expo Push)
 *
 * All notification creation flows through here so icons, titles, and
 * body strings stay consistent across every trigger, and native iOS/Android
 * devices registered via /api/mobile/push-token receive instant push banners.
 */
import { db } from "@/lib/db";
import fs from "fs/promises";
import path from "path";

type NotifType =
  | "marketplace_prospect"
  | "marketplace_sale"
  | "general"
  | "new_post"
  | "new_comment"
  | "comment_reply"
  | "mention"
  | "new_marketplace"
  | "quiz_announcement"
  | "quiz_daily"
  | "quiz_result"
  | "quiz_reward";

const TOKENS_FILE = path.join(process.cwd(), "data", "mobile_push_tokens.json");

async function dispatchExpoPush(
  memberIds: number[],
  title: string,
  body: string,
  link?: string
) {
  try {
    const raw = await fs.readFile(TOKENS_FILE, "utf8").catch(() => "[]");
    const allTokens: Array<{ memberId: number; token: string }> = JSON.parse(raw);
    if (!Array.isArray(allTokens) || allTokens.length === 0) return;

    const targetSet = new Set(memberIds);
    const matchingTokens = allTokens
      .filter(
        (t) =>
          targetSet.has(Number(t.memberId)) &&
          typeof t.token === "string" &&
          (t.token.startsWith("ExponentPushToken[") || t.token.startsWith("ExpoPushToken["))
      )
      .map((t) => t.token);

    if (matchingTokens.length === 0) return;

    const messages = matchingTokens.map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data: { link: link || "/(tabs)" },
      priority: "high",
      channelId: "hgf-connect-alerts",
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    }).catch(() => {});
  } catch {
    // Non-blocking push dispatch
  }
}

/** Create a single in-app notification + native push alert. Fire-and-forget — never throws. */
export async function createNotification({
  memberId,
  type,
  title,
  body,
  link,
  actorId,
}: {
  memberId: number;
  type: NotifType;
  title: string;
  body: string;
  link?: string;
  actorId?: number;
}) {
  try {
    await (db as any).notification.create({
      data: { memberId, type, title, body, link: link ?? null, actorId: actorId ?? null },
    });
    void dispatchExpoPush([memberId], title, body, link);
  } catch (err) {
    console.error("[notify] createNotification failed:", (err as Error).message);
  }
}

/**
 * Notify ALL active/approved members except the actor.
 * Used for new posts and new marketplace listings.
 */
export async function notifyAllMembers({
  actorId,
  type,
  title,
  body,
  link,
}: {
  actorId: number;
  type: NotifType;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    const members = await (db as any).member.findMany({
      where: { status: { in: ["active", "approved"] }, id: { not: actorId } },
      select: { id: true },
    });
    if (!members.length) return;
    const memberIds = members.map((m: { id: number }) => m.id);
    await (db as any).notification.createMany({
      data: memberIds.map((id: number) => ({
        memberId: id,
        type,
        title,
        body,
        link: link ?? null,
        actorId,
      })),
      skipDuplicates: true,
    });
    void dispatchExpoPush(memberIds, title, body, link);
  } catch (err) {
    console.error("[notify] notifyAllMembers failed:", (err as Error).message);
  }
}
