import { parseChangeMetadata } from "./change-metadata";

const archived = {
  schemaVersion: 1,
  slug: "stable-change",
  title: "Stable Change",
  status: "archived",
  lifecycle: "archived",
  startedAt: "2026-08-01",
  archivedAt: "2026-08-04",
  summary: "A durable archived Change.",
  capabilities: ["platform/blueprint"],
  tags: ["workflow"],
};

describe("parseChangeMetadata", () => {
  it("keeps the stable slug while using a dated archive directory", () => {
    expect(
      parseChangeMetadata(
        archived,
        "archived",
        "2026-08-04-stable-change",
        "archive",
      ),
    ).toMatchObject({
      slug: "stable-change",
      href: "/changes/archive/2026-08-04-stable-change/",
    });
  });

  it("rejects unknown fields and lifecycle/status mismatches", () => {
    expect(() =>
      parseChangeMetadata(
        { ...archived, runtimeClaim: "worker-1" },
        "archived",
        "2026-08-04-stable-change",
        "archive",
      ),
    ).toThrow("does not satisfy the Change metadata contract");

    expect(() =>
      parseChangeMetadata(
        { ...archived, lifecycle: "applying" },
        "archived",
        "2026-08-04-stable-change",
        "archive",
      ),
    ).toThrow("does not satisfy the Change metadata contract");
  });
});
