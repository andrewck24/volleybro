import type { Root } from "fumadocs-core/page-tree";

import { changeArtifacts } from "./change-artifacts";

const changeUrl = "/changes/sample-change";

/**
 * The shape fumadocs produces for these Changes: because each Change's
 * `meta.json` lists `index`, the Overview is a plain child page and the folder
 * has no hoisted `index`.
 */
function tree(children: Root["children"]): Root {
  return {
    name: "Changes",
    children: [
      {
        type: "folder",
        name: "In Progress",
        children: [
          {
            type: "folder",
            name: "sample-change",
            children: [
              { type: "page", name: "Overview", url: changeUrl },
              ...children,
            ],
          },
        ],
      },
    ],
  };
}

describe("changeArtifacts", () => {
  it("keeps page-tree order and takes titles from the pages themselves", () => {
    const artifacts = changeArtifacts(
      tree([
        { type: "page", name: "Design", url: `${changeUrl}/design` },
        { type: "page", name: "Review", url: `${changeUrl}/review` },
      ]),
      changeUrl,
    );

    expect(artifacts).toEqual([
      { title: "Design", href: `${changeUrl}/design` },
      { title: "Review", href: `${changeUrl}/review` },
    ]);
  });

  it("expands an artifact group into one entry per sub-page", () => {
    const artifacts = changeArtifacts(
      tree([
        {
          type: "folder",
          name: "Specs",
          children: [
            {
              type: "folder",
              name: "rally-input",
              index: {
                type: "page",
                name: "rally-input",
                url: `${changeUrl}/specs/rally-input`,
              },
              children: [],
            },
          ],
        },
      ]),
      changeUrl,
    );

    expect(artifacts).toEqual([
      {
        title: "Specs · rally-input",
        href: `${changeUrl}/specs/rally-input`,
      },
    ]);
  });

  it("never links the Overview page to itself", () => {
    expect(changeArtifacts(tree([]), changeUrl)).toEqual([]);
  });

  it("also matches a folder whose Overview is its hoisted index", () => {
    const artifacts = changeArtifacts(
      {
        name: "Changes",
        children: [
          {
            type: "folder",
            name: "sample-change",
            index: { type: "page", name: "Overview", url: changeUrl },
            children: [
              { type: "page", name: "Design", url: `${changeUrl}/design` },
            ],
          },
        ],
      },
      changeUrl,
    );

    expect(artifacts).toEqual([
      { title: "Design", href: `${changeUrl}/design` },
    ]);
  });

  it("returns nothing for a Change that is not in the tree", () => {
    expect(changeArtifacts(tree([]), "/changes/missing")).toEqual([]);
  });
});
