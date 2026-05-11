import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence Turbopack warning; transformers.js WASM/worker loading is handled
  // at runtime by the browser, so no special bundler config is needed.
  turbopack: {},
};

export default nextConfig;
