import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Served as static files by the API's own web server (Caddy), next to /api.
  output: "export",
  // Emit facility/index.html rather than facility.html, so /facility/ is found
  // as a directory index. Link and router.push add the slash themselves.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
