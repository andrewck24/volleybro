import type { Folder, Item, Root } from "fumadocs-core/page-tree";
import { createChangesBreadcrumbTree, createChangesTree } from "./changes-tree";

function page(slug: string): Item {
  return { type: "page", name: slug, url: `/changes/${slug}` };
}

function change(slug: string): Folder {
  return { type: "folder", name: slug, index: page(slug), children: [] };
}

function sourceTree(...children: Root["children"]): Root {
  return { $id: "source", name: "root", children };
}

describe("createChangesTree", () => {
  it("lists a Change folder holding only its index as that page", () => {
    const tree = createChangesTree(sourceTree(change("alpha")), []);

    expect(tree.children).toEqual([page("alpha")]);
  });

  it("orders Changes by the given hrefs and puts unknown ones last", () => {
    const tree = createChangesTree(
      sourceTree(change("alpha"), change("beta"), change("gamma")),
      ["/changes/gamma", "/changes/alpha"],
    );

    expect(tree.children).toEqual([page("gamma"), page("alpha"), page("beta")]);
  });
});

describe("createChangesBreadcrumbTree", () => {
  it("puts every Change under a Changes root that links to the index", () => {
    const tree = createChangesBreadcrumbTree(
      createChangesTree(sourceTree(change("alpha")), []),
    );

    expect(tree.children).toEqual([
      {
        type: "folder",
        name: "Changes",
        root: true,
        index: { type: "page", name: "All Changes", url: "/changes" },
        children: [page("alpha")],
      },
    ]);
  });
});
