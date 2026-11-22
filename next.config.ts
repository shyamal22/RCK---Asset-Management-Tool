import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Asset photos are resized on the phone first; this is headroom, not the target size.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
};

export default nextConfig;
