import * as errors from "@/entities/errors";
import { ABSORBED_REASONS, ERROR_MESSAGES } from "@/lib/api/error-messages";

/**
 * Derived from the module's exports, not from a list of enum names. A sixth
 * reason enum must be covered the moment it is exported, which naming the
 * five by hand would not achieve.
 */
const isReasonEnum = (value: unknown): value is Record<string, string> =>
  typeof value === "object" &&
  value !== null &&
  Object.values(value).every((member) => typeof member === "string");

const allReasons = Object.values(errors)
  .filter(isReasonEnum)
  .flatMap((reasonEnum) => Object.values(reasonEnum));

describe("error-messages catalogue", () => {
  it("derives its reasons from the errors module rather than a written list", () => {
    // Guards the derivation itself: a filter that silently matched nothing
    // would make every assertion below vacuously true.
    expect(allReasons).toContain(errors.ProfileReason.PROFILE_NOT_FOUND);
    expect(allReasons.length).toBeGreaterThanOrEqual(24);
  });

  it("covers every reason with either a catalogue entry or an absorption", () => {
    const uncovered = allReasons.filter(
      (reason) =>
        !(reason in ERROR_MESSAGES) &&
        !(ABSORBED_REASONS as readonly string[]).includes(reason),
    );
    expect(uncovered).toEqual([]);
  });

  it("has no overlap between ABSORBED_REASONS and catalogue entries", () => {
    const overlap = ABSORBED_REASONS.filter(
      (reason) => reason in ERROR_MESSAGES,
    );
    expect(overlap).toEqual([]);
  });
});
