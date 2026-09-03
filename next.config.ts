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

// The test deployment is a production deployment of a second project, because
// Hobby's protection covers everything except production -- which leaves it
// publicly reachable, so it has to declare itself unindexable. A header rather
// than a robots.txt disallow: blocking the crawl would stop a crawler ever
// reading the noindex.
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
