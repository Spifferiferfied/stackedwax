import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [new URL("https://i.discogs.com/**")],
  },
};

export default nextConfig;
