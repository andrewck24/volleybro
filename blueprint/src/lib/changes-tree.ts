import type { Node, Root } from "fumadocs-core/page-tree";

function nodeUrl(node: Node) {
  if (node.type === "page") return node.url;
  if (node.type === "folder") return node.index?.url;
  return undefined;
}

// A Change is one page, but its directory makes it a folder whose only page
// is its index; it lists as that page, so the sidebar shows no chevron. The
// Changes are ordered by `hrefs`, the /changes index order (ADR-0078).
export function createChangesTree(sourceTree: Root, hrefs: string[]): Root {
  const rank = (node: Node) => {
    const index = hrefs.indexOf(nodeUrl(node) ?? "");
    return index === -1 ? hrefs.length : index;
  };

  return {
    ...sourceTree,
    children: sourceTree.children
      .map((node) =>
        node.type === "folder" && node.index && node.children.length === 0
          ? node.index
          : node,
      )
      .sort((a, b) => rank(a) - rank(b)),
  };
}

// The breadcrumb and the previous/next links read this tree, so a Change
// page reads Changes > <change>.
export function createChangesBreadcrumbTree(changesTree: Root): Root {
  return {
    $id: "blueprint-changes-breadcrumb-content",
    name: "Changes",
    children: [
      {
        type: "folder",
        name: "Changes",
        root: true,
        index: { type: "page", name: "All Changes", url: "/changes" },
        children: changesTree.children,
      },
    ],
  };
}
