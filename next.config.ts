import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  agentRules: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
