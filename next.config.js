import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const removeProperties =
  process.env.NODE_ENV === "production"
    ? { properties: ["^data-testid$"] }
    : false;

/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: {},
  experimental: {
    optimizePackageImports: ["react-icons"],
  },
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
    removeConsole: process.env.NODE_ENV === "production",
    reactRemoveProperties: removeProperties,
  },
};

export default withBundleAnalyzer(nextConfig);
