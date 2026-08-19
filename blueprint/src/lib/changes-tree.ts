import type { Folder, Item, Root } from "fumadocs-core/page-tree";

const lifecycleUrls: Record<string, string> = {
  Discussing: "/changes?status=discussing",
  "In Progress": "/changes?status=in-progress",
  Archive: "/changes?status=archived#archive",
};

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

export function createChangesBreadcrumbTree(sourceTree: Root): Root {
  const lifecycleFolders = sourceTree.children.flatMap((node) => {
    if (node.type !== "folder" || typeof node.name !== "string") return [];

    const lifecycleUrl = lifecycleUrls[node.name];
    if (!lifecycleUrl) return [];

    const children = node.children.map((child) =>
      child.type === "folder" ? withNavigableFolders(child) : child,
    );

    return [
      {
        ...node,
        index: {
          type: "page" as const,
          name: node.name,
          url: lifecycleUrl,
        },
        children,
      },
    ];
  });

  return {
    $id: "blueprint-changes-breadcrumb-content",
    name: "Changes",
    children: [
      {
        type: "folder",
        name: "Changes",
        root: true,
        index: { type: "page", name: "All Changes", url: "/changes" },
        children: lifecycleFolders,
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
