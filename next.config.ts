import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "recipe1.ezmember.co.kr",
      },
      {
        protocol: "https",
        hostname: "www.10000recipe.com",
      },
    ],
  },
};

export default nextConfig;
