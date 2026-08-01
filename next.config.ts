import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle for the Docker production image.
  output: "standalone",
  // Keep Prisma (and the pg driver) as external server modules so the engine
  // binaries and adapter are bundled correctly for serverless (Vercel/Lambda).
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
