import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources",
  description: "Sunday Word PDFs, devotionals, and church resources from House of Grace Fellowship.",
};

export default function ResourcesPage() {
  return (
    <>
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
            Resources
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.0625rem" }}>
            Sunday Word PDFs and church materials
          </p>
        </div>

        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📖</div>
          <p style={{ color: "#64748b", fontSize: "1.0625rem" }}>
            Resources will be available here once migrated from the legacy system.
          </p>
          <p style={{ color: "#94a3b8", marginTop: "0.5rem", fontSize: "0.9rem" }}>
            Ask your admin or moderator to upload Sunday Word PDFs to this section.
          </p>
        </div>
      </div>
    </>
  );
}
