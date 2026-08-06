import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // UploadThing serves files from https://<appId>.ufs.sh/f/<key>.
    remotePatterns: [{ protocol: "https", hostname: "**.ufs.sh" }],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
