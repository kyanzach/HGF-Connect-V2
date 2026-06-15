import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminReviewClient from "./AdminReviewClient";

export const metadata: Metadata = { title: "Review Action Queue — Admin" };

export default async function AdminReviewPage() {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher"].includes(session.user.role)) redirect("/login");

  const pending = await db.member.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      type: true, ageGroup: true, joinDate: true, invitedBy: true, createdAt: true, address: true,
      ministries: { include: { ministry: { select: { name: true } } } },
    },
  });

  const pendingMinistries = await db.memberMinistry.findMany({
    where: { status: "pending" },
    orderBy: { requestedAt: "desc" },
    select: {
      id: true,
      memberId: true,
      ministryId: true,
      requestedAt: true,
      member: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
      ministry: {
        select: { id: true, name: true },
      },
    },
  });

  return <AdminReviewClient pending={pending as any} pendingMinistries={pendingMinistries as any} />;
}
