import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import PublicNav from "@/components/layout/PublicNav";
import ProfileClient from "./ProfileClient";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const m = await db.member.findUnique({ where: { id: parseInt(id) }, select: { firstName: true, lastName: true } });
  if (!m) return { title: "Member Not Found" };
  return {
    title: `${m.firstName} ${m.lastName} — HGF Connect`,
    openGraph: {
      title: `${m.firstName} ${m.lastName} — HGF Connect`,
      description: `View ${m.firstName}'s profile on HGF Connect.`,
    },
  };
}

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const session = await auth();

  const member = await db.member.findUnique({
    where: { id },
    include: {
      ministries: {
        where: { status: "active" },
        include: { ministry: { select: { id: true, name: true } } },
        orderBy: { joinedDate: "asc" },
      },
    },
  });

  if (!member || member.status !== "active") notFound();

  const isOwn = session?.user?.id === String(id);
  const isAdmin = session ? ["admin", "moderator"].includes(session.user.role ?? "") : false;

  // Serialize for client — only pass privacy-safe data
  const safeData = {
    id: member.id,
    firstName: member.firstName ?? "",
    lastName: member.lastName ?? "",
    profilePicture: member.profilePicture ?? null,
    coverPhoto: member.coverPhoto ?? null,
    coverPhotoPositionX: Number(member.coverPhotoPositionX) || 50,
    coverPhotoPositionY: Number(member.coverPhotoPositionY) || 50,
    favoriteVerse: member.favoriteVerse ?? null,
    joinDate: member.joinDate?.toISOString() ?? null,
    birthdate: member.birthdate?.toISOString() ?? null,
    baptismDate: member.baptismDate?.toISOString() ?? null,
    invitedBy: member.invitedBy ?? null,
    address: member.address ?? null,
    email: member.email ?? null,
    phone: member.phone ?? null,
    showEmail: member.showEmail ?? false,
    showPhone: member.showPhone ?? false,
    showAddress: member.showAddress ?? false,
    familyMembers: member.familyMembers ?? null,
    ministries: member.ministries.map((mm) => ({
      id: mm.id,
      ministry: mm.ministry,
      joinedDate: mm.joinedDate?.toISOString() ?? null,
    })),
    isOwn,
    isAdmin,
  };

  return (
    <>
      <PublicNav />
      <ProfileClient member={safeData} />
    </>
  );
}
