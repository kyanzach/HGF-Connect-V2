import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "HGF Connect",
    template: "%s | HGF Connect",
  },
  description:
    "House of Grace Fellowship — Church management portal for members, events, and community.",
  keywords: ["church", "HGF", "House of Grace Fellowship", "Davao", "Philippines"],
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "https://connect.houseofgrace.ph",
    siteName: "HGF Connect",
    title: "HGF Connect",
    description: "House of Grace Fellowship member portal — events, directory, ministries.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
