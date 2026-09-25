jest.mock("server-only", () => ({}), { virtual: true });

const mockGetPages = jest.fn();
jest.mock("@/lib/source", () => ({
  source: { getPages: () => mockGetPages() },
}));

let mockLegacyDirs: Record<string, unknown> = {};
jest.mock("node:fs", () => {
  const actual = jest.requireActual("node:fs");
  return {
    ...actual,
    existsSync: (target: string) => {
      if (target.endsWith("content/changes")) return true;
      const slug = target.split("/").slice(-2, -1)[0];
      return Object.hasOwn(mockLegacyDirs, slug);
    },
    readdirSync: (_dir: string, _options: unknown) =>
      Object.keys(mockLegacyDirs).map((name) => ({
        name,
        isDirectory: () => true,
      })),
    readFileSync: (target: string) => {
      const slug = target.split("/").slice(-2, -1)[0];
      return JSON.stringify(mockLegacyDirs[slug]);
    },
  };
});

import { listChanges } from "./changes-index";

function page(slug: string, title: string) {
  return { slugs: slug.split("/"), data: { title }, url: `/changes/${slug}` };
}

describe("listChanges", () => {
  beforeEach(() => {
    mockLegacyDirs = {};
  });

  it("lists each single-page Change by its page title, sorted by slug", () => {
    mockGetPages.mockReturnValue([
      page("b", "B Change"),
      page("a", "A Change"),
    ]);

    expect(listChanges()).toEqual([
      { slug: "a", title: "A Change", href: "/changes/a" },
      { slug: "b", title: "B Change", href: "/changes/b" },
    ]);
  });

  it("lists legacy Changes after single-page Changes, newest archivedAt/startedAt first", () => {
    mockGetPages.mockReturnValue([page("a", "A Change")]);
    mockLegacyDirs = {
      older: {
        schemaVersion: 1,
        slug: "older",
        title: "Older Legacy",
        lifecycle: "archived",
        startedAt: "2026-01-01",
        archivedAt: "2026-01-05",
        summary: "s",
        capabilities: ["platform/x"],
        tags: ["frontend"],
      },
      newer: {
        schemaVersion: 1,
        slug: "newer",
        title: "Newer Legacy",
        lifecycle: "proposing",
        startedAt: "2026-02-01",
        summary: "s",
        capabilities: ["platform/x"],
        tags: ["frontend"],
      },
    };

    expect(listChanges()).toEqual([
      { slug: "a", title: "A Change", href: "/changes/a" },
      { slug: "newer", title: "Newer Legacy", href: "/changes/newer" },
      { slug: "older", title: "Older Legacy", href: "/changes/older" },
    ]);
  });

  it("lists an old-format Change once, though its index is a top-level page too", () => {
    mockGetPages.mockReturnValue([page("stale", "Stale Index")]);
    mockLegacyDirs = {
      stale: {
        schemaVersion: 1,
        slug: "stale",
        title: "Stale Legacy",
        lifecycle: "archived",
        startedAt: "2026-01-01",
        archivedAt: "2026-01-05",
        summary: "s",
        capabilities: ["platform/x"],
        tags: ["frontend"],
      },
    };

    expect(listChanges()).toEqual([
      { slug: "stale", title: "Stale Legacy", href: "/changes/stale" },
    ]);
  });
});
