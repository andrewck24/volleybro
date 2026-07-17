import {
  API_UNAUTHORIZED_EVENT,
  ApiClientError,
  apiClient,
} from "@/lib/api/api-client";

const makeFetchResponse = (status: number, body: object) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

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
      jest.spyOn(global, "fetch").mockResolvedValue(
        makeFetchResponse(401, {
          code: "AUTHENTICATION",
          reason: "SESSION_REQUIRED",
          detail: "Authentication is required",
        }) as unknown as Response,
      );
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
      jest.spyOn(global, "fetch").mockResolvedValue(
        makeFetchResponse(409, {
          code: "CONFLICT",
          reason: "ALREADY_EXISTS",
          detail: "Already exists",
        }) as unknown as Response,
      );

      await expect(apiClient("/api/test")).rejects.toThrow(ApiClientError);
      const unauthorizedCalls = dispatchSpy.mock.calls.filter(
        ([e]) => e instanceof CustomEvent && e.type === API_UNAUTHORIZED_EVENT,
      );
      expect(unauthorizedCalls).toHaveLength(0);
    });
  });

  describe("on success response", () => {
    it("returns parsed JSON and does not dispatch any event", async () => {
      jest
        .spyOn(global, "fetch")
        .mockResolvedValue(
          makeFetchResponse(200, { id: "123" }) as unknown as Response,
        );

      const result = await apiClient<{ id: string }>("/api/test");
      expect(result).toEqual({ id: "123" });
      const unauthorizedCalls = dispatchSpy.mock.calls.filter(
        ([e]) => e instanceof CustomEvent && e.type === API_UNAUTHORIZED_EVENT,
      );
      expect(unauthorizedCalls).toHaveLength(0);
    });
  });
});
