import type { NextConfig } from "next";
import path from "path";

// FERPA mode's security headers and the /privacy redirect live in src/proxy.ts, since the mode can change per visitor.
const nextConfig: NextConfig = {
  images: { unoptimized: true },
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      { source: "/", destination: "/home", permanent: false },
      { source: "/subscribe", destination: "/home", permanent: false },
    ];
  },
};

export default nextConfig;
