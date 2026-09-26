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

import { listChanges } from "./changes-index";

function page(slug: string, title: string) {
  return {
    slugs: slug.split("/"),
    data: { title, description: `${title} in one line` },
    url: `/changes/${slug}`,
  };
}

describe("listChanges", () => {
  beforeEach(() => {
    mockFacts = {};
  });

  it("orders Changes newest first, by archivedAt then startedAt", () => {
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

    expect(listChanges().map((change) => change.slug)).toEqual([
      "open",
      "landed",
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
    mockGetPages.mockReturnValue([page("draft", "Draft"), page("old", "Old")]);
    mockFacts = {
      old: {
        gate: "G2",
        startedAt: "2026-06-01T00:00:00.000Z",
        archivedAt: "2026-06-16T00:00:00.000Z",
      },
    };

    const changes = listChanges();
    expect(changes.map((change) => change.slug)).toEqual(["old", "draft"]);
    expect(changes[1].date).toBeUndefined();
  });

  it("labels a converted draft as a draft rather than by a gate", () => {
    mockGetPages.mockReturnValue([page("idea", "Idea")]);
    mockFacts = {
      idea: { converted: true, startedAt: "2026-07-07T00:00:00.000Z" },
    };

    expect(listChanges()[0].state).toEqual({
      label: "draft",
      status: "draft",
    });
  });
});
