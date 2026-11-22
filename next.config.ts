import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Asset photos are resized on the phone first; this is headroom, not the target size.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  // The service worker must never be served stale, or phones keep an old copy.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
};

export default nextConfig;
