import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Profile pictures and uploads served from /public/uploads/
  // Access via /uploads/profile_pictures/{filename}
  images: {
    // Allow unoptimized for local uploads served as static files
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "connect.houseofgrace.ph",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

export default nextConfig;
