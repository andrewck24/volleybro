import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const removeProperties =
  process.env.NODE_ENV === "production"
    ? { properties: ["^data-testid$"] }
    : false;

const noIndexHeaders =
  process.env.DISALLOW_INDEXING === "true"
    ? [
        {
          source: "/:path*",
          headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
        },
      ]
    : [];

const nextConfig: NextConfig = {
  turbopack: {},
  headers: async () => noIndexHeaders,
  experimental: {
    optimizePackageImports: ["react-icons"],
  },
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",").map((s) =>
    s.trim(),
  ),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "**",
      },
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
    reactRemoveProperties: removeProperties,
  },
};

export default withBundleAnalyzer(withSerwist(nextConfig));
