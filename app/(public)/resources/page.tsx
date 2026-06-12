import type { Metadata } from "next";
import { db } from "@/lib/db";
import ResourcesClient from "./ResourcesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sermon Resources | House of Grace Fellowship",
  description: "Explore and download Sunday sermon slide decks, read AI sermon commentary/reflections, and study God's word with the congregation.",
};

export default async function ResourcesPage() {
  const events = await db.event.findMany({
    where: {
      presentationFile: { not: null },
    },
    orderBy: { eventDate: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      eventDate: true,
      coverPhoto: true,
      presentationFile: true,
      presentationOriginalName: true,
      presentationSlides: true,
      speaker: true,
      commentary: true,
    },
  });

  const serializedEvents = JSON.parse(JSON.stringify(events));

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <header
        style={{
          background: "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 100%)",
          color: "white",
          padding: "3.5rem 1.5rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
          Sermon Resources
        </h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.0625rem", margin: 0 }}>
          Study slides, reflection takeaway commentaries, and sermon downloads
        </p>
      </header>

      <main>
        <ResourcesClient events={serializedEvents} />
      </main>
    </div>
  );
}
