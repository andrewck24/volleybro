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

const nextConfig: NextConfig = {
  turbopack: {},
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
