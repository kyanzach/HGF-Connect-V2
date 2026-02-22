import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) {
    redirect("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar session={session} />
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
