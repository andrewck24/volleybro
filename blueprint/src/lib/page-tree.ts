import type { Node, Root } from "fumadocs-core/page-tree";

export function flattenIndexOnlyFolders(tree: Root): Root {
  const flatten = (nodes: Node[]): Node[] =>
    nodes.flatMap((node): Node[] => {
      if (node.type !== "folder") return [node];

      const children = flatten(node.children);
      if (node.index && children.length === 0) return [node.index];

      return [{ ...node, children }];
    });

  return { ...tree, children: flatten(tree.children) };
}
