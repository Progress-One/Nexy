import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // VPS deploy: emit .next/standalone for minimal runtime image.
  output: 'standalone',
};

export default nextConfig;
