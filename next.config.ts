import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "recipe1.ezmember.co.kr" },
      { protocol: "https", hostname: "www.10000recipe.com" },
      { protocol: "https", hostname: "*.ezmember.co.kr" },
      { protocol: "https", hostname: "cdn.wtable.co.kr" },
      { protocol: "http", hostname: "recipe1.ezmember.co.kr" },
    ],
    // 크롤링한 외부 이미지는 최적화 없이 직접 로드
    unoptimized: true,
  },
};

export default nextConfig;
