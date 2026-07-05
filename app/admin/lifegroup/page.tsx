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

  const [registrations, leaders] = await Promise.all([
    db.lifeGroupRegistration.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignedLeader: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    }),
    db.member.findMany({
      where: {
        role: { in: ["admin", "moderator"] },
        status: "approved"
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      },
      orderBy: { firstName: "asc" }
    })
  ]);

  const serializedRegistrations = JSON.parse(JSON.stringify(registrations));
  const serializedLeaders = JSON.parse(JSON.stringify(leaders));

  return (
    <LifeGroupAdminClient
      initialRegistrations={serializedRegistrations}
      candidateLeaders={serializedLeaders}
    />
  );
}
