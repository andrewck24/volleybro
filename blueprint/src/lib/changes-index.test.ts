jest.mock("server-only", () => ({}), { virtual: true });

const mockGetPages = jest.fn();
jest.mock("@/lib/source", () => ({
  source: { getPages: () => mockGetPages() },
}));

let mockProposalMockups: Record<string, unknown> = {};
jest.mock("@/lib/proposal-mockups", () => ({
  get proposalMockups() {
    return mockProposalMockups;
  },
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
    mockProposalMockups = {};
    mockLegacyDirs = {};
  });

  it("titles and links from proposal.mdx when both proposal and delivery exist", () => {
    mockGetPages.mockReturnValue([
      page("a/proposal", "A Proposal"),
      page("a/delivery", "A Delivery"),
    ]);

    expect(listChanges()).toEqual([
      { slug: "a", title: "A Proposal", href: "/changes/a/proposal" },
    ]);
  });

  it("falls back to the delivery title and href when there is no proposal.mdx", () => {
    mockGetPages.mockReturnValue([page("b/delivery", "B Delivery")]);

    expect(listChanges()).toEqual([
      { slug: "b", title: "B Delivery", href: "/changes/b/delivery" },
    ]);
  });

  it("falls back to the slug and a proposal href for a proposal.tsx-only mockup", () => {
    mockGetPages.mockReturnValue([]);
    mockProposalMockups = { c: () => null };

    expect(listChanges()).toEqual([
      { slug: "c", title: "c", href: "/changes/c/proposal" },
    ]);
  });

  it("lists legacy Changes after two-gate Changes, newest archivedAt/startedAt first", () => {
    mockGetPages.mockReturnValue([page("a/proposal", "A Proposal")]);
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
      { slug: "a", title: "A Proposal", href: "/changes/a/proposal" },
      { slug: "newer", title: "Newer Legacy", href: "/changes/newer" },
      { slug: "older", title: "Older Legacy", href: "/changes/older" },
    ]);
  });
});
