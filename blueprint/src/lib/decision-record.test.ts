import { parseDecisionRecord } from "./decision-record";

const decision = {
  schemaVersion: 1,
  id: "D1",
  title: "Keep workflow repository-owned",
  status: "accepted",
  targets: ["platform/delivery-workflow"],
  context: "Manual delivery must remain possible.",
  decision: "Use a repository-owned workflow contract.",
  alternatives: [
    {
      option: "Make the runtime own delivery policy",
      reason: "It would couple durable knowledge to orchestration.",
    },
  ],
  consequences: ["Manual and orchestrated Apply share one contract."],
  revisitTriggers: ["A repository cannot express its delivery policy."],
};

describe("parseDecisionRecord", () => {
  it("accepts a complete schema-compatible record", () => {
    expect(parseDecisionRecord(decision)).toEqual(decision);
  });

  it.each([
    { ...decision, id: "decision-1" },
    { ...decision, targets: ["platform/delivery", "platform/delivery"] },
    { ...decision, targets: ["platform"] },
    { ...decision, context: "" },
    { ...decision, claimedBy: "worker-1" },
    { ...decision, alternatives: [{ option: "Incomplete" }] },
    { ...decision, status: "running" },
  ])("rejects schema-incompatible input", (record) => {
    expect(() => parseDecisionRecord(record)).toThrow(
      "Invalid decision record",
    );
  });
});
