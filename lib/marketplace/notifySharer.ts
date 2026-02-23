import { db } from "@/lib/db";

/**
 * Send an in-app notification to the sharer of a listing.
 * Fire-and-forget safe — errors are logged but never thrown.
 */
export async function notifySharerProspect(
  sharerId: number,
  listingTitle: string,
  listingId: number,
  prospectName: string,
  actionType: "reveal" | "contact"
) {
  try {
    const action = actionType === "contact" ? "contacted you" : "revealed the discount";
    await db.notification.create({
      data: {
        memberId: sharerId,
        type: "marketplace_prospect",
        title: "🎉 Someone responded to your share!",
        body: `${prospectName} ${action} via your shared link for "${listingTitle}".`,
        link: `/marketplace/my-shares`,
      },
    });
  } catch (err) {
    console.error("[notifySharerProspect]", (err as Error).message);
  }
}

export async function notifySharerSaleConfirmed(
  sharerId: number,
  listingTitle: string,
  listingId: number,
  loveGiftAmount: number
) {
  try {
    await db.notification.create({
      data: {
        memberId: sharerId,
        type: "marketplace_sale",
        title: "💰 Your share led to a sale!",
        body: `The seller confirmed a sale for "${listingTitle}". You've been credited ₱${loveGiftAmount.toLocaleString()} Love Gift!`,
        link: `/marketplace/my-shares`,
      },
    });
  } catch (err) {
    console.error("[notifySharerSaleConfirmed]", (err as Error).message);
  }
}
