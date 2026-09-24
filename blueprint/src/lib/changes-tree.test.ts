import type { Folder, Item, Root } from "fumadocs-core/page-tree";
import { createChangesBreadcrumbTree } from "./changes-tree";

function page(name: string, url: string): Item {
  return { type: "page", name, url };
}

// createChangesBreadcrumbTree wraps every top-level folder of the source
// tree (one per Change) inside a single root "Changes" folder.
function changeFolderOf(tree: Root, slug: string): Folder {
  const changesRoot = tree.children[0];
  if (changesRoot.type !== "folder") throw new Error("expected root folder");
  const found = changesRoot.children.find(
    (child) => child.type === "folder" && child.name === slug,
  );
  if (!found || found.type !== "folder") throw new Error(`no folder ${slug}`);
  return found;
}

describe("createChangesBreadcrumbTree", () => {
  it("collapses a multi-page Change's first page into `index`", () => {
    const tree: Root = {
      $id: "source",
      name: "root",
      children: [
        {
          type: "folder",
          name: "two-page-change",
          children: [
            page("Proposal", "/changes/two-page-change/proposal"),
            page("Review", "/changes/two-page-change/review"),
          ],
        },
      ],
    };

    const changeFolder = changeFolderOf(
      createChangesBreadcrumbTree(tree),
      "two-page-change",
    );

    expect(changeFolder.index?.url).toBe("/changes/two-page-change/proposal");
    expect(changeFolder.children).toEqual([
      page("Review", "/changes/two-page-change/review"),
    ]);
  });

  // Regression test: a Change with only one published page (e.g. only a
  // Proposal, before Review exists) must keep that page as a distinct
  // child with no `index` set. Fumadocs' breadcrumb algorithm drops a
  // folder from the path when it is immediately followed by its own
  // `index` page, so collapsing the lone page into `index` here would read
  // "Changes > Proposal" instead of "Changes > single-page-change >
  // Proposal", losing the middle breadcrumb level.
  it("keeps a single-page Change's page as a distinct child, not the folder's index", () => {
    const tree: Root = {
      $id: "source",
      name: "root",
      children: [
        {
          type: "folder",
          name: "single-page-change",
          children: [page("Proposal", "/changes/single-page-change/proposal")],
        },
      ],
    };

    const changeFolder = changeFolderOf(
      createChangesBreadcrumbTree(tree),
      "single-page-change",
    );

    expect(changeFolder.index).toBeUndefined();
    expect(changeFolder.children).toEqual([
      page("Proposal", "/changes/single-page-change/proposal"),
    ]);
  });
});
