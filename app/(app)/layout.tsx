import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppHeader from "@/components/app/AppHeader";
import BottomDock from "@/components/app/BottomDock";
import BiometricEnrollTrigger from "@/components/BiometricEnrollTrigger";

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
        // NO maxWidth here — header and footer must be full width
      }}
    >
      {/* Sticky Top Header — full width */}
      <AppHeader />

      {/* Scrollable Page Content — constrained to 500px, centered */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom) + 8px)",
          WebkitOverflowScrolling: "touch" as any,
          maxWidth: "500px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {children}
      </main>

      {/* Fixed Bottom Dock — full width via position:fixed left:0 right:0 */}
      <BottomDock />

      {/* Biometric enrollment modal — fires once after first OTP login on a new device */}
      <BiometricEnrollTrigger />
    </div>
  );
}
