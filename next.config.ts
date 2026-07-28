import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const generatedPrismaClient = path.join(
  projectRoot,
  "src/generated/prisma/client.ts",
);

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@prisma/client$": generatedPrismaClient,
      };
    }
    return config;
  },
};

export default nextConfig;
