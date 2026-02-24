/**
 * lib/notify.ts — Shared notification helper
 *
 * All notification creation flows through here so icons, titles, and
 * body strings stay consistent across every trigger.
 */
import { db } from "@/lib/db";

type NotifType =
  | "marketplace_prospect"
  | "marketplace_sale"
  | "general"
  | "new_post"
  | "new_comment"
  | "comment_reply"
  | "mention"
  | "new_marketplace";

/** Create a single in-app notification. Fire-and-forget — never throws. */
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
  } catch (err) {
    console.error("[notify] createNotification failed:", (err as Error).message);
  }
}

/**
 * Notify ALL active members except the actor.
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
      where: { status: "active", id: { not: actorId } },
      select: { id: true },
    });
    if (!members.length) return;
    await (db as any).notification.createMany({
      data: members.map((m: { id: number }) => ({
        memberId: m.id,
        type,
        title,
        body,
        link: link ?? null,
        actorId,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    console.error("[notify] notifyAllMembers failed:", (err as Error).message);
  }
}
