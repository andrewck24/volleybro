import type { ComponentType } from "react";

// Webpack's own type, not shipped by @types/node.
interface RequireContext {
  keys(): string[];
  (id: string): { default: ComponentType };
}

// content/changes is gitignored (Change pages are throwaway review
// surfaces; see ADR-0045) and usually absent on a fresh checkout.
// Verified: webpack's require.context fails the build ("Module not found")
// when the directory is entirely missing, so `dev`/`build` in package.json
// `mkdir -p` it first.
const req = (
  require as unknown as {
    context: (dir: string, sub: boolean, re: RegExp) => RequireContext;
  }
).context("../../content/changes", true, /\/proposal\.tsx$/);

export const proposalMockups: Record<string, ComponentType> =
  Object.fromEntries(
    req.keys().map((key: string) => [
      // key looks like "./<slug>/proposal.tsx"
      key.replace(/^\.\//, "").replace(/\/proposal\.tsx$/, ""),
      req(key).default,
    ]),
  );
