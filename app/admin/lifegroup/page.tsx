import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import LifeGroupAdminClient from "./LifeGroupAdminClient";

export const metadata: Metadata = { title: "LIFE Group Registrations | Admin" };

export default async function LifeGroupAdminPage() {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher"].includes(session.user.role)) {
    redirect("/login");
  }

  const registrations = await db.lifeGroupRegistration.findMany({
    orderBy: { createdAt: "desc" },
  });

  const serialized = JSON.parse(JSON.stringify(registrations));

  return <LifeGroupAdminClient initialRegistrations={serialized} />;
}
