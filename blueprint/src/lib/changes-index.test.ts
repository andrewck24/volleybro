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

import { listChanges } from "./changes-index";

function page(slug: string, title: string) {
  return { slugs: slug.split("/"), data: { title }, url: `/changes/${slug}` };
}

describe("listChanges", () => {
  beforeEach(() => {
    mockProposalMockups = {};
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
});
