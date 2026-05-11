import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lock Turbopack to this app — there's a stray lockfile at ~/brain/ that
  // would otherwise be picked as the inferred workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
