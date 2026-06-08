import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import BirthdayAdminClient from "./BirthdayAdminClient";

export const metadata = {
  title: "Birthday Announcements Control Board",
};

export default async function BirthdayAdminPage() {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher"].includes(session.user.role)) {
    redirect("/login");
  }

  // Fetch active members with birthdate
  const members = await db.member.findMany({
    where: { status: "active", birthdate: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
      coverPhoto: true,
      birthdate: true,
    },
    orderBy: { firstName: "asc" },
  });

  return <BirthdayAdminClient initialMembers={JSON.parse(JSON.stringify(members))} />;
}
