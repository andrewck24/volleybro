import { parseChangeMetadata } from "./change-metadata";

const archived = {
  schemaVersion: 1,
  slug: "stable-change",
  title: "Stable Change",
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
      parseChangeMetadata(archived, "2026-08-04-stable-change", "archive"),
    ).toMatchObject({
      slug: "stable-change",
      href: "/changes/archive/2026-08-04-stable-change/",
    });
  });

  it("derives the coarse status from the lifecycle", () => {
    expect(
      parseChangeMetadata(
        { ...archived, lifecycle: "pre-pr-review", archivedAt: undefined },
        "stable-change",
        "in-progress",
      ),
    ).toMatchObject({ lifecycle: "pre-pr-review", status: "in-progress" });
  });

  it("requires an archive date once the lifecycle is archived", () => {
    expect(() =>
      parseChangeMetadata(
        { ...archived, archivedAt: undefined },
        "stable-change",
        "archive",
      ),
    ).toThrow("does not satisfy the Change metadata contract");
  });

  it("rejects unknown fields and unknown lifecycle values", () => {
    expect(() =>
      parseChangeMetadata(
        { ...archived, runtimeClaim: "worker-1" },
        "2026-08-04-stable-change",
        "archive",
      ),
    ).toThrow("does not satisfy the Change metadata contract");

    expect(() =>
      parseChangeMetadata(
        { ...archived, lifecycle: "half-done" },
        "2026-08-04-stable-change",
        "archive",
      ),
    ).toThrow("does not satisfy the Change metadata contract");
  });
});
