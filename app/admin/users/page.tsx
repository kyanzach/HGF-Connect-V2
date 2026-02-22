import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminUsersClient from "./AdminUsersClient";

export const metadata: Metadata = { title: "Users — Admin" };

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin");

  // All active members with an email address (i.e., those who can log in)
  const users = await db.member.findMany({
    where: { status: "active", email: { not: null } },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, status: true, lastLogin: true },
  });

  return <AdminUsersClient users={users as any[]} />;
}
