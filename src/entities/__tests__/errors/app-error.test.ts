import {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  TransientError,
  UnexpectedError,
} from "@/entities/errors/app-error";

describe("AppError class hierarchy", () => {
  describe("constructor with internalMessage", () => {
    it("sets reason, detail, and message separately", () => {
      const error = new NotFoundError(
        "PLAYER_NOT_FOUND",
        "The specified player does not exist",
        "Player 6721a not found in team abc",
      );
      expect(error.reason).toBe("PLAYER_NOT_FOUND");
      expect(error.detail).toBe("The specified player does not exist");
      expect(error.message).toBe("Player 6721a not found in team abc");
    });
  });

  describe("constructor without internalMessage", () => {
    it("defaults message to detail", () => {
      const error = new AuthenticationError(
        "SESSION_REQUIRED",
        "Authentication is required",
      );
      expect(error.message).toBe("Authentication is required");
      expect(error.detail).toBe("Authentication is required");
    });
  });

  describe("instanceof chain", () => {
    it("ConflictError is instanceof ConflictError, AppError, and Error", () => {
      const error = new ConflictError("ALREADY_INVITED", "Already invited");
      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });
  });
});

describe("ValidationError with details field", () => {
  it("carries Zod issues array as details", () => {
    const zodIssues = [{ path: ["email"], message: "Invalid email" }];
    const error = new ValidationError(
      "INVALID_INPUT",
      "Request data failed validation",
      undefined,
      zodIssues,
    );
    expect(error.details).toEqual(zodIssues);
  });

  it("has undefined details when not provided", () => {
    const error = new ValidationError("INVALID_EMAIL", "Invalid email format");
    expect(error.details).toBeUndefined();
  });
});

describe("UnexpectedError with originalError field", () => {
  it("preserves the original error object", () => {
    const original = new TypeError("Cannot read property 'x' of undefined");
    const error = new UnexpectedError(
      "UNHANDLED_ERROR",
      "An unexpected error occurred",
      undefined,
      original,
    );
    expect(error.originalError).toBe(original);
  });

  it("has undefined originalError when not provided", () => {
    const error = new UnexpectedError(
      "UNHANDLED_ERROR",
      "An unexpected error occurred",
    );
    expect(error.originalError).toBeUndefined();
  });
});

describe("TransientError with source metadata", () => {
  it("carries source and retryable options", () => {
    const error = new TransientError(
      "DATABASE_UNAVAILABLE",
      "Service temporarily unavailable",
      undefined,
      { source: "database", retryable: true },
    );
    expect(error.source).toBe("database");
    expect(error.retryable).toBe(true);
  });

  it("has undefined source and retryable when no options provided", () => {
    const error = new TransientError(
      "SERVICE_UNAVAILABLE",
      "Service temporarily unavailable",
    );
    expect(error.source).toBeUndefined();
    expect(error.retryable).toBeUndefined();
  });
});
