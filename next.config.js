/** @type {import('next').NextConfig} */
const { version } = require("./package.json");

const nextConfig = {
  // Expose version from package.json to all client components
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  // Profile pictures and uploads served from /public/uploads/
  // Access via /uploads/profile_pictures/{filename}
  images: {
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

module.exports = nextConfig;
