import type { Root } from "fumadocs-core/page-tree";

import { createChangesBreadcrumbTree } from "./changes-tree";

// Changes sit directly under content/changes, and the loader indexes only
// meta.json, so a Change's design and implementation pages reach the tree as
// pages rather than as folders shadowing them.
const sourceTree: Root = {
  name: "Changes",
  children: [
    {
      type: "folder",
      name: "Example Change",
      children: [
        {
          type: "page",
          name: "Overview",
          url: "/changes/example-change",
        },
        {
          type: "page",
          name: "Design",
          url: "/changes/example-change/design",
        },
        {
          type: "page",
          name: "Implementation",
          url: "/changes/example-change/implementation",
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
                url: "/changes/example-change/specs/example-capability",
              },
              children: [],
            },
            {
              type: "folder",
              name: "Another Capability",
              index: {
                type: "page",
                name: "Another Capability",
                url: "/changes/example-change/specs/another-capability",
              },
              children: [],
            },
          ],
        },
        {
          type: "page",
          name: "Review",
          url: "/changes/example-change/review",
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

  const change = root.children[0];
  if (change.type !== "folder") throw new Error("expected Change folder");

  expect(change.index).toMatchObject({
    type: "page",
    name: "Overview",
    url: "/changes/example-change",
  });

  const specs = change.children.find(
    (child) => child.type === "folder" && child.name === "Specs",
  );

  expect(specs).toMatchObject({
    type: "folder",
    name: "Specs",
    index: {
      type: "page",
      name: "Example Capability",
      url: "/changes/example-change/specs/example-capability",
    },
    children: [
      {
        type: "folder",
        name: "Another Capability",
        index: {
          type: "page",
          name: "Another Capability",
          url: "/changes/example-change/specs/another-capability",
        },
        children: [],
      },
    ],
  });

  expect(
    change.children
      .filter((child) => child.type === "page")
      .map((page) => page.url),
  ).toEqual([
    "/changes/example-change/design",
    "/changes/example-change/implementation",
    "/changes/example-change/review",
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
    "/changes/example-change",
    "/changes/example-change/design",
    "/changes/example-change/implementation",
    "/changes/example-change/specs/example-capability",
    "/changes/example-change/specs/another-capability",
    "/changes/example-change/review",
  ]);
});
