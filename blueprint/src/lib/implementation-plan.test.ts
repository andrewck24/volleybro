import { resolveImplementationPlan } from "./implementation-plan";

const slice = (id: string, dependsOn: string[] = []) => ({
  id,
  title: `Slice ${id}`,
  capabilities: ["platform/delivery-workflow"],
  dependsOn,
  outcome: "A verifiable vertical outcome.",
  acceptanceCriteria: ["The outcome is observable."],
  verification: ["pnpm test:workflow"],
  status: "completed",
});

describe("resolveImplementationPlan", () => {
  it("uses plan order as the rendered order", () => {
    const result = resolveImplementationPlan(
      { schemaVersion: 1, change: "sample-change", slices: ["S01", "S02"] },
      [
        { source: "S02.json", value: slice("S02", ["S01"]) },
        { source: "S01.json", value: slice("S01") },
      ],
      "sample-change",
    );

    expect(result.map(({ id }) => id)).toEqual(["S01", "S02"]);
  });

  it("accepts schema-compatible IDs with three or more digits", () => {
    expect(
      resolveImplementationPlan(
        { schemaVersion: 1, change: "sample-change", slices: ["S100"] },
        [{ source: "S100.json", value: slice("S100") }],
        "sample-change",
      ),
    ).toMatchObject([{ id: "S100" }]);
  });

  it("rejects missing, extra, duplicate, or out-of-order dependencies", () => {
    expect(() =>
      resolveImplementationPlan(
        { schemaVersion: 1, change: "sample-change", slices: ["S01"] },
        [
          { source: "S01.json", value: slice("S01") },
          { source: "S02.json", value: slice("S02") },
        ],
        "sample-change",
      ),
    ).toThrow("same unique IDs");

    expect(() =>
      resolveImplementationPlan(
        {
          schemaVersion: 1,
          change: "sample-change",
          slices: ["S01", "S02"],
        },
        [
          { source: "S01.json", value: slice("S01", ["S02"]) },
          { source: "S02.json", value: slice("S02") },
        ],
        "sample-change",
      ),
    ).toThrow("appear earlier");
  });

  it("rejects runtime fields and unsupported durable statuses", () => {
    expect(() =>
      resolveImplementationPlan(
        { schemaVersion: 1, change: "sample-change", slices: ["S01"] },
        [
          {
            source: "S01.json",
            value: { ...slice("S01"), claimedBy: "worker-1" },
          },
        ],
        "sample-change",
      ),
    ).toThrow("slice contract");

    expect(() =>
      resolveImplementationPlan(
        { schemaVersion: 1, change: "sample-change", slices: ["S01"] },
        [
          {
            source: "S01.json",
            value: { ...slice("S01"), $schema: 123 },
          },
        ],
        "sample-change",
      ),
    ).toThrow("slice contract");

    expect(() =>
      resolveImplementationPlan(
        { schemaVersion: 1, change: "sample-change", slices: ["S01"] },
        [
          {
            source: "S01.json",
            value: { ...slice("S01"), status: "running" },
          },
        ],
        "sample-change",
      ),
    ).toThrow("slice contract");
  });
});
