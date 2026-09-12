/** @type {import('next').NextConfig} */
const { version } = require("./package.json");

const nextConfig = {
  experimental: {
    proxyClientMaxBodySize: "500mb",
  },
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
      // Worship tool shortlinks
      {
        source: "/worship",
        destination: "/theworshiptool.html",
        permanent: false,
      },
      {
        source: "/theworship",
        destination: "/theworshiptool.html",
        permanent: false,
      },
      {
        source: "/the-worship",
        destination: "/theworshiptool.html",
        permanent: false,
      },
      {
        source: "/stage",
        destination: "/theworshiptool.html",
        permanent: false,
      },
      // Word tool shortlinks
      {
        source: "/word",
        destination: "/thewordtool.html",
        permanent: false,
      },
      {
        source: "/theword",
        destination: "/thewordtool.html",
        permanent: false,
      },
      {
        source: "/the-word",
        destination: "/thewordtool.html",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
