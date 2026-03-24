import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/entities/errors/app-error";
import { AuthReason } from "@/entities/errors/reasons/auth";
import { withAuth, withErrorHandler } from "@/lib/api/wrappers";
import { z } from "zod";

// Mock next/server to avoid Request/Response polyfill issues in jsdom
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: ResponseInit) => ({
      _body: body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

// Mock Better Auth session
jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

// Mock next/headers
jest.mock("next/headers", () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}));

import { auth } from "@/lib/auth";
const mockGetSession = auth.api.getSession as unknown as jest.Mock;

// Minimal request stub — wrappers only need url and method for logging
const makeRequest = () =>
  ({ url: "http://localhost/api/test", method: "GET" }) as never;

// Helper to call handler and get response shape
async function call(
  handler: (
    req: never,
  ) => Promise<{ status: number; json: () => Promise<unknown> }>,
) {
  const res = await handler(makeRequest());
  const body = await res.json();
  return { status: res.status, body };
}

// --- Task 2.1: withErrorHandler ---

describe("withErrorHandler", () => {
  describe("AppError serialization", () => {
    it("returns structured JSON with httpStatus when AppError is thrown", async () => {
      const handler = withErrorHandler(async () => {
        throw new ConflictError(
          "ALREADY_INVITED",
          "This player already has a pending invitation",
          "Player 6721a already invited to team abc",
        );
      });

      const { status, body } = await call(handler as never);

      expect(status).toBe(409);
      expect(body).toEqual({
        code: "CONFLICT",
        reason: "ALREADY_INVITED",
        detail: "This player already has a pending invitation",
      });
    });

    it("does not expose internalMessage in response", async () => {
      const handler = withErrorHandler(async () => {
        throw new NotFoundError(
          "PLAYER_NOT_FOUND",
          "The specified player does not exist",
          "Player 6721a not found in team abc",
        );
      });

      const { body } = await call(handler as never);

      expect(JSON.stringify(body)).not.toContain("6721a");
      expect(JSON.stringify(body)).not.toContain("abc");
    });

    it("includes details field for ValidationError", async () => {
      const zodIssues = [{ path: ["email"], message: "Invalid email" }];
      const handler = withErrorHandler(async () => {
        throw new ValidationError(
          "INVALID_INPUT",
          "Request data failed validation",
          undefined,
          zodIssues,
        );
      });

      const { status, body } = await call(handler as never);

      expect(status).toBe(400);
      expect((body as { details: unknown }).details).toEqual(zodIssues);
    });

    it("does not include details field for non-ValidationError AppError", async () => {
      const handler = withErrorHandler(async () => {
        throw new ConflictError("REASON", "detail");
      });

      const { body } = await call(handler as never);

      expect(body).not.toHaveProperty("details");
    });
  });

  describe("ZodError conversion", () => {
    it("converts ZodError to ValidationError response with details", async () => {
      const schema = z.object({ email: z.string().email() });
      const handler = withErrorHandler(async () => {
        schema.parse({ email: "not-an-email" });
        return undefined as never;
      });

      const { status, body } = await call(handler as never);
      const b = body as {
        code: string;
        reason: string;
        detail: string;
        details: unknown[];
      };

      expect(status).toBe(400);
      expect(b.code).toBe("VALIDATION");
      expect(b.reason).toBe("INVALID_INPUT");
      expect(b.detail).toBe("Request data failed validation");
      expect(Array.isArray(b.details)).toBe(true);
    });
  });

  describe("unknown error wrapping", () => {
    it("wraps unknown error as UnexpectedError with 500 and generic body", async () => {
      const handler = withErrorHandler(async () => {
        throw new TypeError("Cannot read property 'x' of undefined");
      });

      const { status, body } = await call(handler as never);

      expect(status).toBe(500);
      expect(body).toEqual({
        code: "UNEXPECTED",
        reason: "UNHANDLED_ERROR",
        detail: "An unexpected error occurred",
      });
      expect(JSON.stringify(body)).not.toContain("Cannot read property");
    });
  });

  describe("success passthrough", () => {
    it("returns handler response unchanged on success", async () => {
      const mockResponse = {
        status: 200,
        json: async () => ({ id: "team-1" }),
      };
      const handler = withErrorHandler(async () => mockResponse as never);

      const { status, body } = await call(handler as never);

      expect(status).toBe(200);
      expect(body).toEqual({ id: "team-1" });
    });
  });
});

// --- Task 2.2: structured error logging ---

describe("withErrorHandler structured logging", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("emits warn-level JSON log via console.error for AppError", async () => {
    const handler = withErrorHandler(async () => {
      throw new NotFoundError(
        "PLAYER_NOT_FOUND",
        "The specified player does not exist",
      );
    });

    await handler(makeRequest() as never);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const log = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(log.level).toBe("warn");
    expect(log.code).toBe("NOT_FOUND");
    expect(log.reason).toBe("PLAYER_NOT_FOUND");
    expect(log).toHaveProperty("message");
    expect(log).toHaveProperty("path");
    expect(log).toHaveProperty("method");
    expect(log).toHaveProperty("timestamp");
  });

  it("emits error-level JSON log with stack trace for unknown error", async () => {
    const handler = withErrorHandler(async () => {
      throw new TypeError("Something went wrong");
    });

    await handler(makeRequest() as never);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const log = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(log.level).toBe("error");
    expect(log.code).toBe("UNEXPECTED");
    expect(log).toHaveProperty("stack");
  });
});

// --- Task 2.3: withAuth ---

describe("withAuth", () => {
  it("passes userId to handler when session is valid", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user123" } });

    let capturedUserId: string | undefined;
    const handler = withAuth(async (_req, { userId }) => {
      capturedUserId = userId;
      return { status: 200, json: async () => ({ ok: true }) } as never;
    });

    await handler(makeRequest() as never);

    expect(capturedUserId).toBe("user123");
  });

  it("returns 401 with structured body when session is absent", async () => {
    mockGetSession.mockResolvedValue(null);

    const handler = withAuth(async () => {
      return { status: 200, json: async () => ({ ok: true }) } as never;
    });

    const { status, body } = await call(handler as never);

    expect(status).toBe(401);
    expect(body).toEqual({
      code: "AUTHENTICATION",
      reason: AuthReason.SESSION_REQUIRED,
      detail: "Authentication is required to access this resource",
    });
  });
});
