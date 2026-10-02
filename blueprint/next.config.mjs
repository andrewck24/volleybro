import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  // Dev only: lets a phone or tablet on the local network load the dev
  // server's scripts, which Next otherwise blocks for any non-localhost host.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  // A static export has no /_next/image endpoint, so MDX images must ship as files.
  images: { unoptimized: true },
  turbopack: false,
  webpack(config, { dev }) {
    // Fumadocs uses dynamic imports that webpack cannot safely cache.
    if (!dev) config.cache = false;
    return config;
  },
};

export default withMDX(config);
