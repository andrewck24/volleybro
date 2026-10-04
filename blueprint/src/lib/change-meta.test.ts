import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

jest.mock("server-only", () => ({}), { virtual: true });

import { readCapabilities, readFacts } from "./change-meta";

function changeWith(frontmatter: string) {
  const root = mkdtempSync(path.join(tmpdir(), "change-meta-"));
  mkdirSync(path.join(root, "c"));
  writeFileSync(
    path.join(root, "c", "index.mdx"),
    `---\n${frontmatter}\n---\n`,
  );
  return root;
}

describe("readCapabilities", () => {
  it("reads an inline list with either quote style", () => {
    const root = changeWith(
      `title: C\ncapabilities: ["platform/blueprint", 'platform/pwa']`,
    );
    expect(readCapabilities("c", root)).toEqual([
      "platform/blueprint",
      "platform/pwa",
    ]);
  });

  it("reads a YAML block list", () => {
    const root = changeWith(
      "title: C\ncapabilities:\n  - platform/blueprint\n  - platform/pwa",
    );
    expect(readCapabilities("c", root)).toEqual([
      "platform/blueprint",
      "platform/pwa",
    ]);
  });

  it("is empty when the page names none", () => {
    expect(readCapabilities("c", changeWith("title: C"))).toEqual([]);
  });
});

describe("readFacts lifecycle overlay", () => {
  function publishedChange() {
    const parent = mkdtempSync(path.join(tmpdir(), "change-facts-"));
    const changes = path.join(parent, "content", "changes");
    const directory = path.join(changes, "c");
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, "index.mdx"), "---\ntitle: C\n---\n");
    writeFileSync(
      path.join(directory, "facts.json"),
      JSON.stringify({
        gate: "G2",
        startedAt: "2026-09-01",
        archivedAt: null,
        commits: 4,
      }),
    );
    return { parent, changes, directory };
  }

  function inputHash(directory: string) {
    const hash = createHash("sha256");
    for (const name of ["facts.json", "index.mdx"]) {
      hash
        .update(name)
        .update("\0")
        .update(readFileSync(path.join(directory, name)));
    }
    return hash.digest("hex");
  }

  it("applies matching lifecycle fields while keeping published gate facts", () => {
    const { parent, changes, directory } = publishedChange();
    writeFileSync(
      path.join(parent, ".change-lifecycle.json"),
      JSON.stringify({
        changes: {
          c: {
            inputHash: inputHash(directory),
            facts: { archivedAt: "2026-10-01T12:00:00.000Z" },
          },
        },
      }),
    );

    expect(readFacts("c", changes)).toEqual({
      gate: "G2",
      startedAt: "2026-09-01",
      archivedAt: "2026-10-01T12:00:00.000Z",
      commits: 4,
    });
  });

  it("ignores an overlay after any Change directory input changes", () => {
    const { parent, changes, directory } = publishedChange();
    writeFileSync(
      path.join(parent, ".change-lifecycle.json"),
      JSON.stringify({
        changes: {
          c: {
            inputHash: inputHash(directory),
            facts: { archivedAt: "2026-10-01T12:00:00.000Z" },
          },
        },
      }),
    );
    writeFileSync(
      path.join(directory, "proposal.mdx"),
      "new published input\n",
    );

    expect(readFacts("c", changes).archivedAt).toBeNull();
  });

  it("preserves converted facts even if an overlay entry exists", () => {
    const { parent, changes, directory } = publishedChange();
    writeFileSync(
      path.join(directory, "facts.json"),
      JSON.stringify({
        converted: true,
        startedAt: "2020-01-01",
        archivedAt: null,
      }),
    );
    writeFileSync(
      path.join(parent, ".change-lifecycle.json"),
      JSON.stringify({
        changes: {
          c: {
            inputHash: inputHash(directory),
            facts: { archivedAt: "2026-10-01T12:00:00.000Z" },
          },
        },
      }),
    );

    expect(readFacts("c", changes)).toEqual({
      converted: true,
      startedAt: "2020-01-01",
      archivedAt: null,
    });
  });
});
