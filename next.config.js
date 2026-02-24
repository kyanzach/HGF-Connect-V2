/** @type {import('next').NextConfig} */
const nextConfig = {
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
