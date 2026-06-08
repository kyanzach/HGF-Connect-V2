import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import BirthdaysClient from "./BirthdaysClient";

export const dynamic = "force-dynamic";

export default async function BirthdaysPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  // Fetch all active members who have a birthday set
  const activeMembers = await db.member.findMany({
    where: {
      status: "active",
      birthdate: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
      coverPhoto: true,
      birthdate: true,
    },
  });

  // Serialize Prisma Date objects for the Client Component
  const serializedMembers = JSON.parse(JSON.stringify(activeMembers));

  return <BirthdaysClient initialMembers={serializedMembers} />;
}
