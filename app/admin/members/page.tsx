import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminMembersClient from "./AdminMembersClient";

export const metadata: Metadata = { title: "Members — Admin" };

export default async function AdminMembersPage() {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) redirect("/login");

  const [members, ministries] = await Promise.all([
    db.member.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        status: true, role: true, type: true, ageGroup: true, joinDate: true,
        createdAt: true, invitedBy: true,
        ministries: { where: { status: "active" }, include: { ministry: { select: { name: true } } }, take: 3 },
      },
    }),
    db.ministry.findMany({ where: { status: "active" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return <AdminMembersClient members={members as any} ministries={ministries} isAdmin={session.user.role === "admin"} />;
}
