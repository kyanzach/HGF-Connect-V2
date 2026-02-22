import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminMinistriesClient from "./AdminMinistriesClient";

export const metadata: Metadata = { title: "Ministries — Admin" };

export default async function AdminMinistriesPage() {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) redirect("/login");

  const ministries = await db.ministry.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: { where: { status: "active" } } } } },
  });

  return <AdminMinistriesClient ministries={ministries as any} />;
}
