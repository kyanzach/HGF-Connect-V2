import { db } from "@/lib/db";
import PublicNav from "@/components/layout/PublicNav";
import { MemberCard } from "@/components/ui/InteractiveCards";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member Directory",
  description: "Browse active members of House of Grace Fellowship in Davao City.",
};

async function getMembers() {
  return db.member.findMany({
    where: { status: "active" },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
      type: true,
      ageGroup: true,
      email: true,
      phone: true,
      showEmail: true,
      showPhone: true,
      joinDate: true,
      ministries: {
        where: { status: "active" },
        include: { ministry: { select: { name: true } } },
        take: 2,
      },
    },
  });
}

export default async function DirectoryPage() {
  const members = await getMembers();

  return (
    <>
      <PublicNav />
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 100%)",
            color: "white",
            padding: "3rem 1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
            Member Directory
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.0625rem" }}>
            {members.length} active members in our community
          </p>
        </div>

        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "3rem 1.5rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
