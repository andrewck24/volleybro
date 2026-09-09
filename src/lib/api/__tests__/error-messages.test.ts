import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as errors from "@/entities/errors";
import { ABSORBED_REASONS, ERROR_MESSAGES } from "@/lib/api/error-messages";

// Derived from the exports, so a sixth reason enum is covered on sight.
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

describe("the catalogue is the only source", () => {
  // Three manual sweeps each missed a copy — one matched object fields, one
  // matched shapes, and neither saw a bare const. A copy that has drifted by a
  // character still escapes this, so it catches recurrence, not every case.
  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return /\.tsx?$/.test(entry.name) ? [full] : [];
    });

  it("holds every catalogue string in one file", () => {
    const catalogue = join("src", "lib", "api", "error-messages.ts");
    const strings = Object.values(ERROR_MESSAGES).flatMap(
      ({ title, description }) => [title, description],
    );

    const copies = sourceFiles("src")
      .filter((file) => file !== catalogue && !file.includes("__tests__"))
      .flatMap((file) => {
        const content = readFileSync(file, "utf8");
        return strings
          .filter((string) => content.includes(`"${string}"`))
          .map((string) => `${file}: ${string}`);
      });

    expect(copies).toEqual([]);
  });
});
