import type { ComponentType } from "react";

// Webpack's own type, not shipped by @types/node.
interface RequireContext {
  keys(): string[];
  (id: string): { default: ComponentType };
}

type WebpackRequire = {
  context: (dir: string, sub: boolean, re: RegExp) => RequireContext;
};

// content/changes is gitignored and usually absent on a fresh checkout, and
// require.context fails the build ("Module not found") when the directory is
// missing, so `dev`/`build` in package.json `mkdir -p` it first.
// Old-format directories carry a design.tsx too, but only single-page slugs
// are looked up here.
const designs = (require as unknown as WebpackRequire).context(
  "../../content/changes",
  true,
  /\/design\.tsx$/,
);

export const singlePageDesigns: Record<string, ComponentType> =
  Object.fromEntries(
    designs
      .keys()
      .map((key) => [
        key.replace(/^\.\//, "").replace("/design.tsx", ""),
        designs(key).default,
      ]),
  );
