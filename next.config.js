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
  // Redirect old /marketplace URLs to /stewardshop
  async redirects() {
    return [
      {
        source: "/marketplace/:path*",
        destination: "/stewardshop/:path*",
        permanent: true,
      },
      {
        source: "/marketplace",
        destination: "/stewardshop",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
