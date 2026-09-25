// Compatibility layer for old-format Change pages; delete once no old-format Change remains.

import type { ComponentType } from "react";

interface TocItem {
  title: string;
  url: string;
  depth: number;
}

// Webpack's own type, not shipped by @types/node.
interface RequireContext {
  keys(): string[];
  (id: string): { default: ComponentType; toc?: TocItem[] };
}

// content/changes is gitignored and usually absent on a fresh checkout; see
// change-designs.ts for the same require.context caveat.
const req = (
  require as unknown as {
    context: (dir: string, sub: boolean, re: RegExp) => RequireContext;
  }
).context("../../content/changes", true, /\/design\.tsx$/);

export const designMockups: Record<
  string,
  { default: ComponentType; toc?: TocItem[] }
> = Object.fromEntries(
  req.keys().map((key: string) => [
    // key looks like "./<slug>/design.tsx"
    key.replace(/^\.\//, "").replace(/\/design\.tsx$/, ""),
    req(key),
  ]),
);
