import type { Node, Root } from "fumadocs-core/page-tree";

function nodeUrl(node: Node) {
  if (node.type === "page") return node.url;
  if (node.type === "folder") return node.index?.url;
  return undefined;
}

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
