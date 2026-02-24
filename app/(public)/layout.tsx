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
  // No maxWidth here — PublicNav must be full-width.
  // Overflow prevention is handled by body { overflow-x: hidden } in globals.css.
  // Each page's own content manages its column centering via PublicNav internals.
  return <>{children}</>;
}
