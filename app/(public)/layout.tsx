/**
 * (public) route group layout — all public-facing pages.
 *
 * Provides the same fluid 500px-centered shell as the authenticated
 * (app) layout so every page looks consistent at all screen sizes.
 *
 * PublicNav is rendered per-page (not here) so pages that need a
 * different header (login, register) can opt out.
 *
 * URL paths are unchanged by the route group parenthesis folder.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#f8fafc",
        // Header / nav rendered per-page — must be full-width, so NO maxWidth here
      }}
    >
      {/* Page content — fluid 500px column, fills 100% on mobile */}
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "500px",
          margin: "0 auto",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>
    </div>
  );
}
