import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { parseDecisionRecord } from "./decision-record";
import { upconvertLegacyDecisionRecord } from "@/legacy/legacy-decision-record";

const CONTENT = path.join(__dirname, "..", "..", "content");
const DECISIONS = path.join(CONTENT, "decisions");
const FEATURES = path.join(CONTENT, "features");

function decisionFiles() {
  return readdirSync(DECISIONS)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

// The tree is the subject: a record that only this suite's fixtures exercise
// would say nothing about the 45 records a Feature page actually renders.
describe("the decision record tree", () => {
  it("holds records", () => {
    expect(existsSync(DECISIONS)).toBe(true);
    expect(decisionFiles().length).toBeGreaterThan(0);
  });

  it("parses every record, naming the file that fails", () => {
    for (const name of decisionFiles()) {
      const raw = JSON.parse(readFileSync(path.join(DECISIONS, name), "utf8"));
      expect(() => {
        try {
          parseDecisionRecord(raw);
        } catch (error) {
          throw new Error(`${name}: ${(error as Error).message}`);
        }
      }).not.toThrow();
    }
  });

  it("uses each number exactly once", () => {
    const ids = decisionFiles().map((name) => name.split("-")[0]);
    expect(ids).toEqual([...new Set(ids)]);
  });

  it("names only capabilities that exist", () => {
    for (const name of decisionFiles()) {
      const record = parseDecisionRecord(
        JSON.parse(readFileSync(path.join(DECISIONS, name), "utf8")),
      );
      for (const capability of record.capabilities) {
        expect(existsSync(path.join(FEATURES, capability))).toBe(true);
      }
    }
  });

  it("leaves no per-capability copy behind", () => {
    const stack = [FEATURES];
    while (stack.length > 0) {
      const dir = stack.pop() as string;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        expect(entry.name).not.toBe("decisions");
        stack.push(path.join(dir, entry.name));
      }
    }
  });
});

describe("the version 2 record format", () => {
  const minimal = {
    schemaVersion: 2,
    id: "D1",
    title: "Decision records leave the delivery lifecycle",
    capabilities: ["platform/blueprint"],
    decision: "Every record lives in one flat directory.",
  };

  it("accepts a record that is only a title, a capability and a decision", () => {
    expect(parseDecisionRecord(minimal)).toEqual(minimal);
  });

  it.each([
    { ...minimal, schemaVersion: 1 },
    { ...minimal, capabilities: undefined, targets: ["platform/blueprint"] },
    { ...minimal, originDecision: "D3" },
    { ...minimal, consequences: [] },
  ])("rejects a record the new format does not allow", (record) => {
    expect(() => parseDecisionRecord(record)).toThrow(
      "Invalid decision record",
    );
  });
});

describe("records published on the store branch", () => {
  const version1 = {
    schemaVersion: 1,
    id: "D1",
    title: "Open state lives with the dialog root",
    status: "implemented",
    targets: ["platform/design-system/overlays"],
    context: "Four parents owned open state differently.",
    decision: "Every dialog carrying an action is controlled.",
    alternatives: [{ option: "Stay uncontrolled", reason: "Bypasses Radix." }],
    consequences: ["The holder decides when the dialog closes."],
    revisitTriggers: ["Radix changes its controlled contract."],
    originChange: "dialog-close-ownership",
    originDecision: "D1",
  };

  it("reads a version 1 record's targets as capabilities", () => {
    const record = parseDecisionRecord(upconvertLegacyDecisionRecord(version1));
    expect(record.capabilities).toEqual(["platform/design-system/overlays"]);
    expect(record).not.toHaveProperty("targets");
    expect(record).not.toHaveProperty("status");
    expect(record).not.toHaveProperty("originDecision");
  });
});
