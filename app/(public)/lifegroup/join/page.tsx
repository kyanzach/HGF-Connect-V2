import type { Metadata } from "next";
import JoinFormClient from "./JoinFormClient";

export const metadata: Metadata = {
  title: "Join a LIFE Group | House of Grace Fellowship",
  description: "Register to join a local LIFE Group at House of Grace Fellowship. Connect, grow, and walk in faith with our church family.",
};

export default function JoinLifeGroupPage() {
  return <JoinFormClient />;
}
