import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminSendSmsClient from "./AdminSendSmsClient";

export const metadata: Metadata = { title: "Send Custom SMS — Admin" };

export default async function AdminSendSmsPage() {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) {
    redirect("/login");
  }

  return <AdminSendSmsClient />;
}
