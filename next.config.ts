import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // nodemailer is a CommonJS node library with dynamic requires; bundling it
  // into the server output breaks those. Loaded from node_modules at runtime
  // instead.
  serverExternalPackages: ['nodemailer'],
  images: {
    // UploadThing serves files from https://<appId>.ufs.sh/f/<key>.
    remotePatterns: [{ protocol: "https", hostname: "**.ufs.sh" }],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400
  },
};

export default nextConfig;
