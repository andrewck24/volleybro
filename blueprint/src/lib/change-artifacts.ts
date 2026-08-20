import type { Folder, Item, Node, Root } from "fumadocs-core/page-tree";

export type ChangeArtifact = { title: string; href: string };

/**
 * The folder whose Overview page is `changeUrl`. A Change's `meta.json` lists
 * `index` explicitly, so the Overview can arrive as a plain child page instead
 * of the folder's hoisted `index`; both shapes have to match.
 */
function findChangeFolder(
  nodes: Node[],
  changeUrl: string,
): Folder | undefined {
  for (const node of nodes) {
    if (node.type !== "folder") continue;
    if (
      node.index?.url === changeUrl ||
      node.children.some(
        (child) => child.type === "page" && child.url === changeUrl,
      )
    ) {
      return node;
    }

    const found = findChangeFolder(node.children, changeUrl);
    if (found) return found;
  }

  return undefined;
}

/** Leaf pages of an artifact group such as `specs/`, in page-tree order. */
function groupPages(folder: Folder): Item[] {
  return [
    ...(folder.index ? [folder.index] : []),
    ...folder.children.flatMap((child) => {
      if (child.type === "page") return [child];
      if (child.type === "folder") return groupPages(child);
      return [];
    }),
  ];
}

function label(name: unknown, fallback: string) {
  return typeof name === "string" ? name : fallback;
}

/**
 * Artifact links for one Change Overview, taken from the pages the content
 * loader actually registered. Titles come from each page's own frontmatter and
 * the order from the Change's `meta.json`, so an Overview cannot link to a page
 * that does not exist or drift from a page's real title.
 *
 * Takes the loader's own `source.pageTree`; the breadcrumb tree is a separate
 * derivation and is not interchangeable with it.
 */
export function changeArtifacts(
  tree: Root,
  changeUrl: string,
): ChangeArtifact[] {
  const folder = findChangeFolder(tree.children, changeUrl);
  if (!folder) return [];

  return folder.children.flatMap((child): ChangeArtifact[] => {
    if (child.type === "page") {
      if (child.url === changeUrl) return [];
      return [{ title: label(child.name, child.url), href: child.url }];
    }

    if (child.type !== "folder") return [];

    const group = label(child.name, "");
    return groupPages(child).map((page) => ({
      title: group
        ? `${group} · ${label(page.name, page.url)}`
        : label(page.name, page.url),
      href: page.url,
    }));
  });
}
