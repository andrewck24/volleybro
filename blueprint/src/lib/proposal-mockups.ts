import type { ComponentType } from "react";

// Webpack's own type, not shipped by @types/node.
interface RequireContext {
  keys(): string[];
  (id: string): { default: ComponentType };
}

// require.context needs literal arguments, so each file name gets its own
// call; the key stripping they share lives here.
function bySlug(
  req: RequireContext,
  file: string,
): Record<string, ComponentType> {
  return Object.fromEntries(
    req
      .keys()
      .map((key: string) => [
        key.replace(/^\.\//, "").replace(`/${file}`, ""),
        req(key).default,
      ]),
  );
}

type WebpackRequire = {
  context: (dir: string, sub: boolean, re: RegExp) => RequireContext;
};

// content/changes is gitignored (Change pages are throwaway review
// surfaces; see ADR-0045) and usually absent on a fresh checkout.
// Verified: webpack's require.context fails the build ("Module not found")
// when the directory is entirely missing, so `dev`/`build` in package.json
// `mkdir -p` it first.
export const proposalMockups = bySlug(
  (require as unknown as WebpackRequire).context(
    "../../content/changes",
    true,
    /\/proposal\.tsx$/,
  ),
  "proposal.tsx",
);

// A single-page Change keeps its mockup in design.tsx; old-format directories
// carry one too, but only single-page slugs are looked up here.
export const singlePageDesigns = bySlug(
  (require as unknown as WebpackRequire).context(
    "../../content/changes",
    true,
    /\/design\.tsx$/,
  ),
  "design.tsx",
);
