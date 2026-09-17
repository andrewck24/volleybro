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

  // A folder with at most one page (a Change that has published only one of
  // proposal/delivery, or a one-page legacy subfolder) must keep that page as its own child rather than
  // being collapsed into `index`. Fumadocs' breadcrumb drops a folder when
  // it is immediately followed by its own index page in the path, so
  // collapsing here would read "Changes > <page>" and lose the change-name
  // level; leaving `index` unset keeps folder and page as distinct path
  // entries.
  if (children.length <= 1) {
    return { ...folder, children };
  }

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
// Changes > <change> > <page>.
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
