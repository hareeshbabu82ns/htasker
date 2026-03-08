import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  allowedDevOrigins: ["*.mcode.local.terabits.io", "*.code.local.terabits.io"],
};

export default nextConfig;
