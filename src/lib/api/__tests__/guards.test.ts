import { describe, expect, it } from "@jest/globals";
import { ValidationError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { assertObjectId } from "@/lib/api/guards";

describe("assertObjectId", () => {
  it("does not throw for a valid 24-char hex ObjectId", () => {
    expect(() => assertObjectId("507f1f77bcf86cd799439011")).not.toThrow();
  });

  it("throws ValidationError for a 23-char hex string", () => {
    expect(() => assertObjectId("507f1f77bcf86cd79943901")).toThrow(
      ValidationError,
    );
  });

  it("throws ValidationError for a 25-char hex string", () => {
    expect(() => assertObjectId("507f1f77bcf86cd799439011a")).toThrow(
      ValidationError,
    );
  });

  it("throws ValidationError for a string with non-hex characters", () => {
    expect(() => assertObjectId("bad-id")).toThrow(ValidationError);
  });

  it('throws ValidationError for the string "undefined"', () => {
    expect(() => assertObjectId("undefined")).toThrow(ValidationError);
  });

  it("includes the param name in the error detail", () => {
    try {
      assertObjectId("bad", "teamId");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      const err = e as ValidationError;
      expect(err.reason).toBe(CommonReason.INVALID_INPUT);
      expect(err.message).toContain("teamId");
    }
  });

  it("uses default param name 'id' when param is omitted", () => {
    try {
      assertObjectId("bad");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      const err = e as ValidationError;
      expect(err.message).toContain("id");
    }
  });
});
