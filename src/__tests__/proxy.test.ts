// Mock next/server before importing proxy
jest.mock("next/server", () => ({
  NextResponse: {
    next: jest.fn(() => ({ status: 200, json: async () => ({}) })),
    redirect: jest.fn((url: URL) => ({
      status: 302,
      headers: { location: url.toString() },
      json: async () => ({}),
    })),
    json: jest.fn((body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

// Mock better-auth/cookies so tests control session token presence
jest.mock("better-auth/cookies", () => ({
  getSessionCookie: jest.fn(),
}));

import { proxy } from "@/proxy";

// Mock next/headers
jest.mock("next/headers", () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}));

// Mock Better Auth — proxy uses getSession for page-level auth
jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

import { getSessionCookie } from "better-auth/cookies";
import { auth } from "@/lib/auth";
const mockGetSessionCookie = getSessionCookie as jest.Mock;
const mockGetSession = auth.api.getSession as unknown as jest.Mock;

const makeRequest = (pathname: string) => ({
  nextUrl: { pathname },
  url: `http://localhost${pathname}`,
  headers: new Headers(),
});

describe("proxy — API authentication gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("unauthenticated API request", () => {
    it("returns 401 JSON for /api/* without session cookie", async () => {
      mockGetSessionCookie.mockReturnValue(null);
      const res = await proxy(makeRequest("/api/teams") as never);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body).toEqual({
        code: "AUTHENTICATION",
        reason: "SESSION_REQUIRED",
        detail: "Authentication is required",
      });
    });

    it("does not forward unauthenticated API request to route handler", async () => {
      mockGetSessionCookie.mockReturnValue(null);
      const res = await proxy(makeRequest("/api/teams") as never);
      expect(res.status).toBe(401);
    });
  });

  describe("auth API routes are excluded from the check", () => {
    it("passes /api/auth/* through without session cookie check", async () => {
      mockGetSession.mockResolvedValue(null);
      const res = await proxy(makeRequest("/api/auth/sign-in") as never);
      expect(res.status).not.toBe(401);
    });
  });

  describe("authenticated API request", () => {
    it("passes /api/* through when session cookie is present", async () => {
      mockGetSessionCookie.mockReturnValue("mock-session-token");
      const res = await proxy(makeRequest("/api/teams") as never);
      expect(res.status).not.toBe(401);
    });
  });
});
