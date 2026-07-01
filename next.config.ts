import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.leonardo.ai",
      },
      {
        protocol: "https",
        hostname: "**.leonardo.ai",
      },
      {
        protocol: "https",
        hostname: "a1-s3-1.alem.ai",
      },
      {
        protocol: "https",
        hostname: "**.alem.ai",
      },
    ],
  },
};

export default nextConfig;
