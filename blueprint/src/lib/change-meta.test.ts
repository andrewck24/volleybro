import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

jest.mock("server-only", () => ({}), { virtual: true });

import { readCapabilities } from "./change-meta";

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
