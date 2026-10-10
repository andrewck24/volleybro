import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  readCapabilities,
  readChangeBuildIdentity,
  readFacts,
} from "./change-meta";

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

describe("readChangeBuildIdentity", () => {
  it("binds the actual Change directory to a valid build receipt", () => {
    const { parent, changes, directory } = publishedChangeFixture();
    const identity = [
      "a".repeat(40),
      "b".repeat(40),
      "c".repeat(40),
      inputHash(directory),
    ].join(":");
    mkdirSync(path.join(parent, "public"));
    writeFileSync(
      path.join(parent, "public", "blueprint-build.json"),
      JSON.stringify({
        sourceSha: "a".repeat(40),
        integrationSha: "b".repeat(40),
        storeSha: "c".repeat(40),
        changeInputHashes: { c: inputHash(directory) },
      }),
    );

    expect(readChangeBuildIdentity("c", changes)).toBe(identity);
  });

  it("omits identity for a missing, malformed, or stale receipt", () => {
    const { parent, changes, directory } = publishedChangeFixture();
    expect(readChangeBuildIdentity("c", changes)).toBeUndefined();
    mkdirSync(path.join(parent, "public"));
    const receiptPath = path.join(parent, "public", "blueprint-build.json");
    writeFileSync(receiptPath, "not json");
    expect(readChangeBuildIdentity("c", changes)).toBeUndefined();
    writeFileSync(
      receiptPath,
      JSON.stringify({
        sourceSha: "a".repeat(40),
        integrationSha: "b".repeat(40),
        storeSha: "c".repeat(40),
        changeInputHashes: { c: "d".repeat(64) },
      }),
    );
    expect(readChangeBuildIdentity("c", changes)).toBeUndefined();
    writeFileSync(path.join(directory, "proposal.mdx"), "changed input\n");
    expect(readChangeBuildIdentity("c", changes)).toBeUndefined();
  });
});

function publishedChangeFixture() {
  const parent = mkdtempSync(path.join(tmpdir(), "change-identity-"));
  const changes = path.join(parent, "content", "changes");
  const directory = path.join(changes, "c");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "index.mdx"), "---\ntitle: C\n---\n");
  writeFileSync(path.join(directory, "facts.json"), '{"gate":"G2"}\n');
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
