import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // pdf-parse uses Node.js specific modules - exclude from bundling
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
