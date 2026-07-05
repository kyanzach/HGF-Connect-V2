import type { Metadata } from "next";
import JoinFormClient from "./JoinFormClient";

export const metadata: Metadata = {
  title: "Join a LIFE Group | House of Grace Fellowship",
  description: "Register to join a local LIFE Group at House of Grace Fellowship. Connect, grow, and walk in faith with our church family.",
  openGraph: {
    title: "Join a LIFE Group | House of Grace Fellowship",
    description: "Register to join a local LIFE Group at House of Grace Fellowship. Connect, grow, and walk in faith with our church family.",
    images: [
      {
        url: "https://connect.houseofgrace.ph/images/lifegroup-og.png",
        width: 1200,
        height: 630,
        alt: "House of Grace Fellowship LIFE Groups",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join a LIFE Group | House of Grace Fellowship",
    description: "Register to join a local LIFE Group at House of Grace Fellowship. Connect, grow, and walk in faith with our church family.",
    images: ["https://connect.houseofgrace.ph/images/lifegroup-og.png"],
  },
};

export default function JoinLifeGroupPage() {
  return <JoinFormClient />;
}
