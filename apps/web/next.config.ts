import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace root is two levels up (pnpm monorepo). Without this hint,
  // Turbopack either infers a stray lockfile at ~/brain/ as the root,
  // or fails to resolve hoisted deps from apps/web/.
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
