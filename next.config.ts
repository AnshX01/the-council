import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ensure server-only packages are not bundled into the client
  serverExternalPackages: ["@google/genai"],
};

export default nextConfig;
