import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppHeader from "@/components/app/AppHeader";
import BottomDock from "@/components/app/BottomDock";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Pending users can only be here if directed explicitly
  // (middleware handles most cases, this is a safety net)

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#f8fafc",
        maxWidth: "500px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* Sticky Top Header */}
      <AppHeader />

      {/* Scrollable Page Content — pb-28 to clear bottom dock */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom) + 8px)",
          WebkitOverflowScrolling: "touch" as any,
        }}
      >
        {children}
      </main>

      {/* Fixed Bottom Dock */}
      <BottomDock />
    </div>
  );
}
