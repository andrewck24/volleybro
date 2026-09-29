import {
  API_UNAUTHORIZED_EVENT,
  ApiClientError,
  apiClient,
} from "@/lib/api/api-client";
import { http, HttpResponse } from "msw";

import { server } from "@test/support/msw/server";

const respond = (status: number, body: object) =>
  server.use(http.get("/api/test", () => HttpResponse.json(body, { status })));

describe("apiClient", () => {
  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    dispatchSpy = jest.spyOn(window, "dispatchEvent");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("on 401 response", () => {
    beforeEach(() => {
      respond(401, {
        code: "AUTHENTICATION",
        reason: "SESSION_REQUIRED",
        detail: "Authentication is required",
      });
    });

    it("dispatches api:unauthorized CustomEvent", async () => {
      await expect(apiClient("/api/test")).rejects.toThrow(ApiClientError);
      const unauthorizedCalls = dispatchSpy.mock.calls.filter(
        ([e]) => e instanceof CustomEvent && e.type === API_UNAUTHORIZED_EVENT,
      );
      expect(unauthorizedCalls).toHaveLength(1);
    });

    it("throws ApiClientError with status 401 after dispatching event", async () => {
      const order: string[] = [];
      dispatchSpy.mockImplementation((e: Event) => {
        if (e instanceof CustomEvent && e.type === API_UNAUTHORIZED_EVENT) {
          order.push("dispatch");
        }
        return true;
      });

      let caught: unknown;
      try {
        await apiClient("/api/test");
      } catch (e) {
        order.push("throw");
        caught = e;
      }

      expect(caught).toBeInstanceOf(ApiClientError);
      expect((caught as ApiClientError).status).toBe(401);
      expect(order).toEqual(["dispatch", "throw"]);
    });
  });

  describe("on non-401 error response", () => {
    it("does NOT dispatch api:unauthorized for 409", async () => {
      respond(409, {
        code: "CONFLICT",
        reason: "ALREADY_EXISTS",
        detail: "Already exists",
      });

      await expect(apiClient("/api/test")).rejects.toThrow(ApiClientError);
      const unauthorizedCalls = dispatchSpy.mock.calls.filter(
        ([e]) => e instanceof CustomEvent && e.type === API_UNAUTHORIZED_EVENT,
      );
      expect(unauthorizedCalls).toHaveLength(0);
    });
  });

  describe("on success response", () => {
    it("returns parsed JSON and does not dispatch any event", async () => {
      respond(200, { id: "123" });

      const result = await apiClient<{ id: string }>("/api/test");
      expect(result).toEqual({ id: "123" });
      const unauthorizedCalls = dispatchSpy.mock.calls.filter(
        ([e]) => e instanceof CustomEvent && e.type === API_UNAUTHORIZED_EVENT,
      );
      expect(unauthorizedCalls).toHaveLength(0);
    });
  });

  describe("on timeout", () => {
    it("aborts via AbortSignal.timeout and rejects with a TRANSIENT ApiClientError", async () => {
      // jsdom's DOMException is not the class Node's fetch throws on abort, so
      // the timeout is simulated by rejecting fetch with jsdom's own instance.
      jest
        .spyOn(global, "fetch")
        .mockRejectedValue(
          new DOMException("The signal timed out", "TimeoutError"),
        );

      let caught: unknown;
      try {
        await apiClient("/api/test", undefined, 5);
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(ApiClientError);
      const error = caught as ApiClientError;
      expect(error.code).toBe("TRANSIENT");
      expect(error.status).toBeGreaterThanOrEqual(500);
      expect(error.reason).toBe("TIMEOUT");
    });
  });

  describe("on network failure", () => {
    it("normalises a fetch rejection into the same ApiClientError shape as an HTTP failure", async () => {
      server.use(http.get("/api/test", () => HttpResponse.error()));

      let caught: unknown;
      try {
        await apiClient("/api/test");
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(ApiClientError);
      const error = caught as ApiClientError;
      expect(error.code).toBe("TRANSIENT");
      expect(error.status).toBeGreaterThanOrEqual(500);
      expect(error.reason).toBe("NETWORK_ERROR");
    });
  });
});
