import {
  ConflictError,
  NotFoundError,
  TransientError,
  ValidationError,
  AuthReason,
  CommonReason,
} from "@/entities/errors";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { withAuth, withErrorHandler } from "@/lib/api/wrappers";
import { z } from "zod";

jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

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
      expect(body).toEqual({ code: "CONFLICT", reason: "ALREADY_INVITED" });
    });

    it("keeps both the internal message and the detail out of the response", async () => {
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
      expect(JSON.stringify(body)).not.toContain(
        "The specified player does not exist",
      );
    });

    it("serializes a closed set of keys, so free text cannot return under another name", async () => {
      const handler = withErrorHandler(async () => {
        throw new TransientError(
          CommonReason.UNHANDLED_ERROR,
          "A temporary database error occurred, please retry",
          "connection 6 closed",
          { source: "database", retryable: true },
          new Error("connection 6 closed"),
        );
      });

      const { status, body } = await call(handler as never);

      expect(status).toBe(503);
      expect(body).toEqual({
        code: "TRANSIENT",
        reason: CommonReason.UNHANDLED_ERROR,
      });
    });

    it("reduces the details field to field paths", async () => {
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
      expect((body as { details: unknown }).details).toEqual([["email"]]);
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
    it("sends field paths and nothing else, from a real schema parse", async () => {
      const schema = z
        .object({
          email: z.string(),
          age: z.number().min(18),
          nested: z.object({ name: z.string() }),
        })
        .strict();
      const handler = withErrorHandler(async () => {
        schema.parse({
          email: 42,
          age: 5,
          nested: { name: null },
          secret: "x",
        });
        return undefined as never;
      });

      const { body } = await call(handler as never);
      const { details } = body as { details: unknown[][] };

      // Asserting against what zod actually emits, not a hand-built issue:
      // the shape of a finalised issue is not the shape its type declares.
      expect(Object.keys(body as object).sort()).toEqual([
        "code",
        "details",
        "reason",
      ]);
      expect(details).toEqual([["email"], ["age"], ["nested", "name"], []]);
      expect(JSON.stringify(details)).not.toContain("expected");
      expect(JSON.stringify(details)).not.toContain("Invalid input");
      expect(JSON.stringify(details)).not.toContain("secret");
    });

    it("converts ZodError to ValidationError response with details", async () => {
      const schema = z.object({ email: z.string().email() });
      const handler = withErrorHandler(async () => {
        schema.parse({ email: "not-an-email" });
        return undefined as never;
      });

      const { status, body } = await call(handler as never);
      const b = body as { code: string; reason: string; details: unknown[] };

      expect(status).toBe(400);
      expect(b.code).toBe("VALIDATION");
      expect(b.reason).toBe("INVALID_INPUT");
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
      expect(body).toEqual({ code: "UNEXPECTED", reason: "UNHANDLED_ERROR" });
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

  it("keeps the identifying message in the log while it is absent from the body", async () => {
    const handler = withErrorHandler(async () => {
      throw new NotFoundError(
        "PLAYER_NOT_FOUND",
        "The specified player does not exist",
        "Player 6721a not found in team abc",
      );
    });

    const res = await handler(makeRequest() as never);
    const body = await res.json();

    const log = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(log.message).toBe("Player 6721a not found in team abc");
    expect(JSON.stringify(body)).not.toContain("6721a");
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
  it("passes the session's userId and email to the handler", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user123", email: "alice@example.com" },
    });

    let captured: { userId: string; email: string } | undefined;
    const handler = withAuth(async (_req, ctx) => {
      captured = ctx;
      return { status: 200, json: async () => ({ ok: true }) } as never;
    });

    await handler(makeRequest() as never);

    expect(captured).toEqual({ userId: "user123", email: "alice@example.com" });
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
    });
  });
});

describe("database connection", () => {
  const mockConnect = connectToMongoDB as unknown as jest.Mock;
  const handler = jest.fn(async () => ({
    status: 200,
    json: async () => ({ ok: true }),
  }));

  beforeEach(() => {
    mockConnect.mockReset().mockResolvedValue(undefined);
    handler.mockClear();
  });

  it("connects before running a withErrorHandler handler", async () => {
    const order: string[] = [];
    mockConnect.mockImplementation(async () => {
      order.push("connect");
    });
    handler.mockImplementation(async () => {
      order.push("handler");
      return { status: 200, json: async () => ({ ok: true }) };
    });

    await withErrorHandler(handler as never)(makeRequest());

    expect(order).toEqual(["connect", "handler"]);
  });

  it("connects before running a withAuth handler", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user123" } });

    await withAuth(handler as never)(makeRequest());

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("returns the standard 500 and skips the handler when connecting fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    mockConnect.mockRejectedValue(new Error("connect failed"));

    const { status, body } = await call(
      withErrorHandler(handler as never) as never,
    );

    expect(status).toBe(500);
    expect(body).toEqual({
      code: "UNEXPECTED",
      reason: CommonReason.UNHANDLED_ERROR,
    });
    expect(handler).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
