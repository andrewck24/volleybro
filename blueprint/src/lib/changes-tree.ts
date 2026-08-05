import type { Folder, Item, Root } from "fumadocs-core/page-tree";

const lifecycleUrls: Record<string, string> = {
  Discussing: "/changes?status=discussing",
  "In Progress": "/changes?status=in-progress",
  Archive: "/changes?status=archived#archive",
};

interface ChangeBreadcrumbPage {
  name: string;
  url: string;
}

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

function containsPage(folder: Folder, url: string): boolean {
  if (folder.index?.url === url) return true;

  return folder.children.some((child) => {
    if (child.type === "page") return child.url === url;
    return child.type === "folder" && containsPage(child, url);
  });
}

function withDirectChangePages(
  folder: Folder,
  pages: readonly ChangeBreadcrumbPage[],
): Folder {
  const normalized = withNavigableFolders(folder);
  const baseUrl = normalized.index?.url;
  if (!baseUrl) return normalized;

  const missingPages = pages.filter((page) => {
    if (!page.url.startsWith(`${baseUrl}/`)) return false;
    const relativeUrl = page.url.slice(baseUrl.length + 1);
    return !relativeUrl.includes("/") && !containsPage(normalized, page.url);
  });
  const remainingPages = new Map(
    missingPages.map((page) => [page.url.split("/").at(-1), page]),
  );
  const children = normalized.children.flatMap((child) => {
    if (child.type !== "folder" || typeof child.name !== "string") {
      return [child];
    }

    const segment =
      child.$ref?.folder.split("/").at(-1) ??
      child.name.toLowerCase().replaceAll(" ", "-");
    const page = remainingPages.get(segment);
    if (!page) return [child];

    remainingPages.delete(segment);
    return [{ type: "page" as const, name: page.name, url: page.url }, child];
  });

  return {
    ...normalized,
    children: [
      ...children,
      ...Array.from(remainingPages.values(), (page): Item => ({
        type: "page",
        name: page.name,
        url: page.url,
      })),
    ],
  };
}

export function createChangesBreadcrumbTree(
  sourceTree: Root,
  pages: readonly ChangeBreadcrumbPage[] = [],
): Root {
  const lifecycleFolders = sourceTree.children.flatMap((node) => {
    if (node.type !== "folder" || typeof node.name !== "string") return [];

    const lifecycleUrl = lifecycleUrls[node.name];
    if (!lifecycleUrl) return [];

    const children = node.children.map((child) =>
      child.type === "folder" ? withDirectChangePages(child, pages) : child,
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
