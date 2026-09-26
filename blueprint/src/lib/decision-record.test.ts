import { parseDecisionRecord } from "./decision-record";

const decision = {
  schemaVersion: 2,
  id: "0001",
  title: "Keep workflow repository-owned",
  capabilities: ["platform/delivery-workflow"],
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

  it("accepts a Feature decision that names its replacement", () => {
    const superseded = { ...decision, supersededBy: "0045" };
    expect(parseDecisionRecord(superseded)).toEqual(superseded);
  });

  it.each([
    { ...decision, supersededBy: "two-gate-workflow" },
    { ...decision, id: "decision-1" },
    { ...decision, schemaVersion: 3 },
    {
      ...decision,
      capabilities: ["platform/delivery", "platform/delivery"],
    },
    { ...decision, capabilities: ["platform"] },
    { ...decision, context: "" },
    { ...decision, claimedBy: "worker-1" },
    { ...decision, alternatives: [{ option: "Incomplete" }] },
  ])("rejects schema-incompatible input", (record) => {
    expect(() => parseDecisionRecord(record)).toThrow(
      "Invalid decision record",
    );
  });
});
