import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import UpdateToast from "@/components/UpdateToast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#4EB1CB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,       // prevent accidental pinch-zoom
  userScalable: false,   // locks zoom — same as GetSales
  viewportFit: "cover",  // safe-area-inset support for notch/island
};

export const metadata: Metadata = {
  title: {
    default: "HGF Connect",
    template: "%s | HGF Connect",
  },
  description:
    "House of Grace Fellowship — Church management portal for members, events, and community.",
  keywords: ["church", "HGF", "House of Grace Fellowship", "Davao", "Philippines"],
  manifest: "/manifest.json",
  icons: {
    icon: "/HGF-icon-v1.0.png",
    apple: "/icons/icon-180.png",
    shortcut: "/HGF-icon-v1.0.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HGF Connect",
  },
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
        <SessionProvider session={session}>
          {children}
          <UpdateToast />
          <ServiceWorkerRegistration />
        </SessionProvider>
      </body>
    </html>
  );
}
