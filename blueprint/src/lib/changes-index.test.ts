jest.mock("server-only", () => ({}), { virtual: true });

const mockGetPages = jest.fn();
jest.mock("@/lib/source", () => ({
  source: { getPages: () => mockGetPages() },
}));

let mockFacts: Record<string, object> = {};
jest.mock("@/lib/change-meta", () => ({
  readFacts: (slug: string) => mockFacts[slug] ?? {},
  readCapabilities: () => ["platform/blueprint"],
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
    readdirSync: () =>
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
  return {
    slugs: slug.split("/"),
    data: { title, description: `${title} in one line` },
    url: `/changes/${slug}`,
  };
}

function legacy(slug: string, startedAt: string, archivedAt?: string) {
  return {
    schemaVersion: 1,
    slug,
    title: `${slug} title`,
    lifecycle: archivedAt ? "archived" : "discussing",
    startedAt,
    ...(archivedAt ? { archivedAt } : {}),
    summary: "s",
    capabilities: ["platform/x"],
    tags: ["frontend"],
  };
}

describe("listChanges", () => {
  beforeEach(() => {
    mockFacts = {};
    mockLegacyDirs = {};
  });

  it("orders both formats on one timeline, newest first, by archivedAt then startedAt", () => {
    mockGetPages.mockReturnValue([
      page("landed", "Landed"),
      page("open", "Open"),
    ]);
    mockFacts = {
      landed: {
        gate: "G2",
        startedAt: "2026-09-20T00:00:00.000Z",
        archivedAt: "2026-09-25T10:00:00.000Z",
      },
      open: {
        gate: "G1",
        startedAt: "2026-09-26T08:00:00.000Z",
        archivedAt: null,
      },
    };
    mockLegacyDirs = {
      old: legacy("old", "2026-06-01", "2026-06-16"),
      idea: legacy("idea", "2026-07-07"),
    };

    expect(listChanges().map((change) => change.slug)).toEqual([
      "open",
      "landed",
      "idea",
      "old",
    ]);
  });

  it("labels a single-page Change by its gate until it lands, then as archived", () => {
    mockGetPages.mockReturnValue([
      page("landed", "Landed"),
      page("open", "Open"),
    ]);
    mockFacts = {
      landed: {
        gate: "G2",
        startedAt: "2026-09-20T00:00:00.000Z",
        archivedAt: "2026-09-25T10:00:00.000Z",
      },
      open: {
        gate: "G2",
        startedAt: "2026-09-21T00:00:00.000Z",
        archivedAt: null,
      },
    };

    const [landed, open] = listChanges();
    expect(landed.state).toEqual({ label: "archived", status: "archived" });
    expect(landed.date).toEqual({
      kind: "archived",
      value: "2026-09-25T10:00:00.000Z",
    });
    expect(open.state).toEqual({ label: "G2 Review", status: "in-progress" });
    expect(open.date).toEqual({
      kind: "started",
      value: "2026-09-21T00:00:00.000Z",
    });
  });

  it("sorts a never-published draft last, with no date", () => {
    mockGetPages.mockReturnValue([page("draft", "Draft")]);
    mockLegacyDirs = { old: legacy("old", "2026-06-01", "2026-06-16") };

    const changes = listChanges();
    expect(changes.map((change) => change.slug)).toEqual(["old", "draft"]);
    expect(changes[1].date).toBeUndefined();
  });

  it("lists an old-format Change once, though its index is a top-level page too", () => {
    mockGetPages.mockReturnValue([page("stale", "Stale Index")]);
    mockLegacyDirs = { stale: legacy("stale", "2026-01-01", "2026-01-05") };

    expect(listChanges().map((change) => change.slug)).toEqual(["stale"]);
  });
});
