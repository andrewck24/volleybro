// The Blueprint bundle drops zod's default locale; clearing it here reproduces
// that, so this fails if decision-record.ts stops configuring one itself.
jest.mock("zod", () => {
  const actual = jest.requireActual("zod");
  actual.z.config({ localeError: undefined });
  return actual;
});

import { parseDecisionRecord } from "./decision-record";

it("names the broken rule even when zod has no locale of its own", () => {
  expect(() =>
    parseDecisionRecord({
      schemaVersion: 2,
      id: "0001",
      title: "A title",
      capabilities: ["platform"],
      decision: "A decision.",
    }),
  ).toThrow(/capabilities\.0: Invalid string: must match pattern/);
});
