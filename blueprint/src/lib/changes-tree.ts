import type { Root } from "fumadocs-core/page-tree";

export const changesTree: Root = {
  name: "Changes",
  children: [
    { type: "page", name: "All Changes", url: "/changes" },
    {
      type: "page",
      name: "Discussing",
      url: "/changes?status=discussing",
    },
    {
      type: "page",
      name: "In Progress",
      url: "/changes?status=in-progress",
    },
    {
      type: "page",
      name: "Archive",
      url: "/changes?status=archived#archive",
    },
  ],
};
