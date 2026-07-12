import type { Root } from "fumadocs-core/page-tree";

// Hand-authored sidebar tree for the /design-system section. The Fumadocs
// source only indexes content/changes, and this section's pages are wired by
// hand (see the design-system route), so its sidebar is authored here too.
// Add future entries (design tokens, color/typography scales) as more pages land.
export const designSystemTree: Root = {
  name: "Design System",
  children: [
    { type: "page", name: "Overview", url: "/design-system" },
    { type: "page", name: "Components", url: "/design-system/components" },
  ],
};
