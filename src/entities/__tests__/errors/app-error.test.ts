import {
  AppError,
  AppErrorCode,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  TransientError,
  UnexpectedError,
} from "@/entities/errors/app-error";

// --- Task 1.1: AppError class hierarchy ---

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

  describe("all seven subclasses have correct fixed properties", () => {
    const cases: Array<{
      Class: new (...args: never[]) => AppError;
      code: AppErrorCode;
      httpStatus: number;
      isTransient: boolean;
    }> = [
      {
        Class: ValidationError as never,
        code: "VALIDATION",
        httpStatus: 400,
        isTransient: false,
      },
      {
        Class: AuthenticationError as never,
        code: "AUTHENTICATION",
        httpStatus: 401,
        isTransient: false,
      },
      {
        Class: AuthorizationError as never,
        code: "AUTHORIZATION",
        httpStatus: 403,
        isTransient: false,
      },
      {
        Class: NotFoundError as never,
        code: "NOT_FOUND",
        httpStatus: 404,
        isTransient: false,
      },
      {
        Class: ConflictError as never,
        code: "CONFLICT",
        httpStatus: 409,
        isTransient: false,
      },
      {
        Class: TransientError as never,
        code: "TRANSIENT",
        httpStatus: 503,
        isTransient: true,
      },
      {
        Class: UnexpectedError as never,
        code: "UNEXPECTED",
        httpStatus: 500,
        isTransient: false,
      },
    ];

    it.each(cases)(
      "$code has httpStatus=$httpStatus and isTransient=$isTransient",
      ({ Class, code, httpStatus, isTransient }) => {
        const error = new (Class as unknown as new (
          reason: string,
          detail: string,
        ) => AppError)("REASON", "detail");
        expect(error.code).toBe(code);
        expect(error.httpStatus).toBe(httpStatus);
        expect(error.isTransient).toBe(isTransient);
      },
    );
  });

  describe("AppErrorCode type union", () => {
    it("each subclass code is assignable to AppErrorCode", () => {
      const codes: AppErrorCode[] = [
        new ValidationError("R", "d").code,
        new AuthenticationError("R", "d").code,
        new AuthorizationError("R", "d").code,
        new NotFoundError("R", "d").code,
        new ConflictError("R", "d").code,
        new TransientError("R", "d").code,
        new UnexpectedError("R", "d").code,
      ];
      expect(codes).toEqual([
        "VALIDATION",
        "AUTHENTICATION",
        "AUTHORIZATION",
        "NOT_FOUND",
        "CONFLICT",
        "TRANSIENT",
        "UNEXPECTED",
      ]);
    });
  });

  describe("name property", () => {
    it("sets name to the constructor name", () => {
      const error = new NotFoundError("R", "d");
      expect(error.name).toBe("NotFoundError");
    });
  });
});

// --- Task 1.2: ValidationError with details field ---

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
    expect(error.httpStatus).toBe(400);
  });

  it("has undefined details when not provided", () => {
    const error = new ValidationError("INVALID_EMAIL", "Invalid email format");
    expect(error.details).toBeUndefined();
  });
});

// --- Task 1.3: UnexpectedError with originalError field ---

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
    expect(error.httpStatus).toBe(500);
  });

  it("has undefined originalError when not provided", () => {
    const error = new UnexpectedError(
      "UNHANDLED_ERROR",
      "An unexpected error occurred",
    );
    expect(error.originalError).toBeUndefined();
  });
});

// --- Task 1.4: TransientError with source metadata ---

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
    expect(error.httpStatus).toBe(503);
    expect(error.isTransient).toBe(true);
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
