import { describe, expect, it } from "@jest/globals";
import type { Result } from "@/applications/types/result";
import { NotFoundError, TransientError } from "@/applications/errors/app-error";

describe("Result type", () => {
  it("should represent a success result", () => {
    const result: Result<number> = { ok: true, value: 42 };
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it("should represent a failure result with NotFoundError", () => {
    const error = new NotFoundError("Player not found");
    const result: Result<number> = { ok: false, error };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(result.error.isTransient).toBe(false);
    }
  });

  it("should represent a failure result with TransientError", () => {
    const error = new TransientError("DB failure");
    const result: Result<number> = { ok: false, error };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(TransientError);
      expect(result.error.isTransient).toBe(true);
    }
  });

  it("should narrow types correctly via discriminated union", () => {
    const success: Result<string> = { ok: true, value: "hello" };
    const failure: Result<string> = {
      ok: false,
      error: new NotFoundError("missing"),
    };

    // Type narrowing: accessing value on success, error on failure
    if (success.ok) {
      const val: string = success.value;
      expect(val).toBe("hello");
    }

    if (!failure.ok) {
      const err = failure.error;
      expect(err.code).toBe("NOT_FOUND");
    }
  });
});
