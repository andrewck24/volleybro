import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  turbopack: false,
  webpack(config, { dev }) {
    // Fumadocs uses dynamic imports that webpack cannot safely cache.
    if (!dev) config.cache = false;
    return config;
  },
};

export default withMDX(config);
