import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to silence the warning
  turbopack: {},
  // Disable source maps in development to avoid Windows path issues
  productionBrowserSourceMaps: false,
  serverExternalPackages: [],
};

export default nextConfig;
