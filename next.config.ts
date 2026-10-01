import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(__dirname),
  transpilePackages: ["lucide-react", "tailwind-merge"],
  serverExternalPackages: ["@google/genai"],
};

export default nextConfig;
