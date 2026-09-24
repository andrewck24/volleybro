// Compatibility layer for old-format Change pages; delete once no old-format Change remains.

jest.mock("server-only", () => ({}), { virtual: true });

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { isLegacySlug, loadChangeMetadata } from "./change-catalog";

describe("isLegacySlug", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "legacy-catalog-"));
    mkdirSync(path.join(root, "old-format"));
    writeFileSync(
      path.join(root, "old-format", "change.json"),
      JSON.stringify({
        schemaVersion: 1,
        slug: "old-format",
        title: "Old Format",
        lifecycle: "archived",
        startedAt: "2026-01-01",
        archivedAt: "2026-01-02",
        summary: "A legacy Change.",
        capabilities: ["platform/x"],
        tags: ["frontend"],
      }),
    );
    mkdirSync(path.join(root, "new-format"));
    writeFileSync(path.join(root, "new-format", "proposal.mdx"), "");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("is true for a directory carrying change.json", () => {
    expect(isLegacySlug("old-format", root)).toBe(true);
  });

  it("is false for a directory without change.json", () => {
    expect(isLegacySlug("new-format", root)).toBe(false);
  });

  it("is false for a slug that does not exist on disk", () => {
    expect(isLegacySlug("missing", root)).toBe(false);
  });

  it("is false for a slug that fails the directory-name pattern", () => {
    expect(isLegacySlug("../old-format", root)).toBe(false);
  });

  it("loads the parsed metadata for a legacy slug", async () => {
    await expect(loadChangeMetadata("old-format", root)).resolves.toMatchObject(
      { slug: "old-format", title: "Old Format", lifecycle: "archived" },
    );
  });
});
