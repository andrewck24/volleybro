import type { Root } from "fumadocs-core/page-tree";

// Hand-authored sidebar tree for the /design-system section. The Fumadocs
// source only indexes content/changes, and this section's pages are wired by
// hand (see the design-system route), so its sidebar is authored here too.
// Keep in sync with the module map in the design-system route.
export const designSystemTree: Root = {
  name: "Design System",
  children: [
    { type: "page", name: "Overview", url: "/design-system" },
    { type: "page", name: "Brand", url: "/design-system/brand" },
    { type: "page", name: "Color", url: "/design-system/color" },
    { type: "page", name: "Typography", url: "/design-system/typography" },
    { type: "page", name: "Spacing", url: "/design-system/spacing" },
    { type: "page", name: "Radius", url: "/design-system/radius" },
    {
      type: "page",
      name: "Elevation & Depth",
      url: "/design-system/elevation-depth",
    },
    { type: "page", name: "Components", url: "/design-system/components" },
  ],
};
