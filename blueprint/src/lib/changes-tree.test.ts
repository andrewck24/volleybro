import type { Root } from "fumadocs-core/page-tree";

import { createChangesBreadcrumbTree } from "./changes-tree";

// The loader indexes only meta.json, so a Change's design and implementation
// pages reach the tree as pages; their data directories are not content.
const sourceTree: Root = {
  name: "Changes",
  children: [
    {
      type: "folder",
      name: "In Progress",
      children: [
        {
          type: "folder",
          name: "Example Change",
          children: [
            {
              type: "page",
              name: "Overview",
              url: "/changes/in-progress/example-change",
            },
            {
              type: "page",
              name: "Design",
              url: "/changes/in-progress/example-change/design",
            },
            {
              type: "page",
              name: "Implementation",
              url: "/changes/in-progress/example-change/implementation",
            },
            {
              type: "folder",
              name: "Specs",
              children: [
                {
                  type: "folder",
                  name: "Example Capability",
                  index: {
                    type: "page",
                    name: "Example Capability",
                    url: "/changes/in-progress/example-change/specs/example-capability",
                  },
                  children: [],
                },
                {
                  type: "folder",
                  name: "Another Capability",
                  index: {
                    type: "page",
                    name: "Another Capability",
                    url: "/changes/in-progress/example-change/specs/another-capability",
                  },
                  children: [],
                },
              ],
            },
            {
              type: "page",
              name: "Review",
              url: "/changes/in-progress/example-change/review",
            },
          ],
        },
      ],
    },
  ],
};

it("provides navigable Fumadocs breadcrumbs without expanding the sidebar tree", () => {
  const tree = createChangesBreadcrumbTree(sourceTree);
  const root = tree.children[0];

  expect(root).toMatchObject({
    type: "folder",
    root: true,
    index: { type: "page", name: "All Changes", url: "/changes" },
  });
  if (root.type !== "folder") throw new Error("expected root folder");

  const lifecycle = root.children[0];
  expect(lifecycle).toMatchObject({
    type: "folder",
    name: "In Progress",
    index: {
      type: "page",
      name: "In Progress",
      url: "/changes?status=in-progress",
    },
  });
  if (lifecycle.type !== "folder") throw new Error("expected lifecycle folder");

  expect(lifecycle.children[0]).toMatchObject({
    type: "folder",
    name: "Example Change",
    index: {
      type: "page",
      name: "Overview",
      url: "/changes/in-progress/example-change",
    },
  });
  const change = lifecycle.children[0];
  if (change.type !== "folder") throw new Error("expected Change folder");

  const specs = change.children.find(
    (child) => child.type === "folder" && child.name === "Specs",
  );

  expect(specs).toMatchObject({
    type: "folder",
    name: "Specs",
    index: {
      type: "page",
      name: "Example Capability",
      url: "/changes/in-progress/example-change/specs/example-capability",
    },
    children: [
      {
        type: "folder",
        name: "Another Capability",
        index: {
          type: "page",
          name: "Another Capability",
          url: "/changes/in-progress/example-change/specs/another-capability",
        },
        children: [],
      },
    ],
  });

  expect(change.index).toMatchObject({
    type: "page",
    name: "Overview",
    url: "/changes/in-progress/example-change",
  });
  expect(
    change.children
      .filter((child) => child.type === "page")
      .map((page) => page.url),
  ).toEqual([
    "/changes/in-progress/example-change/design",
    "/changes/in-progress/example-change/implementation",
    "/changes/in-progress/example-change/review",
  ]);

  const flattenedUrls: string[] = [];
  const collectPages = (folder: typeof change & { type: "folder" }) => {
    if (folder.index) flattenedUrls.push(folder.index.url);
    for (const child of folder.children) {
      if (child.type === "page") flattenedUrls.push(child.url);
      if (child.type === "folder") collectPages(child);
    }
  };
  collectPages(change);

  expect(flattenedUrls).toEqual([
    "/changes/in-progress/example-change",
    "/changes/in-progress/example-change/design",
    "/changes/in-progress/example-change/implementation",
    "/changes/in-progress/example-change/specs/example-capability",
    "/changes/in-progress/example-change/specs/another-capability",
    "/changes/in-progress/example-change/review",
  ]);
});
