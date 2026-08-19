import type { Folder, Item, Root } from "fumadocs-core/page-tree";

function firstPage(folder: Folder): Item | undefined {
  if (folder.index) return folder.index;

  for (const child of folder.children) {
    if (child.type === "page") return child;
    if (child.type === "folder") {
      const page = firstPage(child);
      if (page) return page;
    }
  }

  return undefined;
}

function withNavigableFolders(folder: Folder): Folder {
  const children = folder.children.map((child) =>
    child.type === "folder" ? withNavigableFolders(child) : child,
  );
  const index = folder.index ?? firstPage({ ...folder, children });

  return {
    ...folder,
    index,
    children: children.flatMap((child) => {
      if (child.type === "page" && child.url === index?.url) return [];
      if (child.type !== "folder" || child.index?.url !== index?.url) {
        return [child];
      }

      if (child.children.length === 0) return [];
      return [{ ...child, index: undefined }];
    }),
  };
}

// Changes sit directly under content/changes, so a breadcrumb reads
// Changes > <change> > <page>. The lifecycle is not a path segment and is
// shown by the Overview badge instead.
export function createChangesBreadcrumbTree(sourceTree: Root): Root {
  const changeFolders = sourceTree.children.flatMap((node) =>
    node.type === "folder" ? [withNavigableFolders(node)] : [],
  );

  return {
    $id: "blueprint-changes-breadcrumb-content",
    name: "Changes",
    children: [
      {
        type: "folder",
        name: "Changes",
        root: true,
        index: { type: "page", name: "All Changes", url: "/changes" },
        children: changeFolders,
      },
    ],
  };
}

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
