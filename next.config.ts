import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/connect.houseofgrace.ph/uploads/**",
      },
      {
        protocol: "https",
        hostname: "connect.houseofgrace.ph",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
