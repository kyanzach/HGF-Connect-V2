/**
 * (public) route group layout — all public-facing pages.
 * UnifiedHeader is rendered here so every public page gets it automatically.
 * Login and Register pages are in this group but the header adapts gracefully
 * for guest state (shows Login button instead of bell/dropdown).
 */
import UnifiedHeader from "@/components/layout/UnifiedHeader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UnifiedHeader />
      {children}
    </>
  );
}
