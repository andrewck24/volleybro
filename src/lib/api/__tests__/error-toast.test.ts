import { ApiClientError } from "@/lib/api/api-client";
import { handle401Redirect, showErrorToast } from "@/lib/api/error-toast";
import { RefreshTimeoutError } from "@/hooks/use-pull-to-refresh";
import type { ApiError } from "@/lib/api/parse-api-error";

const makeApiClientError = (
  status: number,
  code: string,
  detail: string,
): ApiClientError => {
  const info: ApiError = {
    code: code as ApiError["code"],
    reason: "TEST",
    detail,
    status,
  };
  return new ApiClientError(detail, info);
};

describe("handle401Redirect", () => {
  let mockToast: jest.Mock;
  let mockRouter: { push: jest.Mock };

  beforeEach(() => {
    mockToast = jest.fn();
    mockRouter = { push: jest.fn() };
  });

  it("shows 登入已逾期 destructive toast", () => {
    handle401Redirect(mockRouter, mockToast);

    expect(mockToast).toHaveBeenCalledWith({
      title: "登入已逾期",
      description: "請重新登入",
      variant: "destructive",
    });
  });

  it("calls router.push to /auth/sign-in in the same synchronous call", () => {
    handle401Redirect(mockRouter, mockToast);

    expect(mockRouter.push).toHaveBeenCalledWith("/auth/sign-in");
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });
});

describe("showErrorToast", () => {
  let mockToast: jest.Mock;

  beforeEach(() => {
    mockToast = jest.fn();
  });

  describe("server / unexpected errors → branded volleyball-themed message", () => {
    it("does NOT echo raw error detail for status 500", () => {
      const error = makeApiClientError(
        500,
        "UNEXPECTED",
        "Internal Server Error",
      );

      showErrorToast(error, mockToast);

      const { description, variant } = mockToast.mock.calls[0][0];
      expect(variant).toBe("destructive");
      expect(description).not.toBe("Internal Server Error");
    });

    it("treats UNEXPECTED code as server error regardless of status", () => {
      const error = makeApiClientError(422, "UNEXPECTED", "Something broke");

      showErrorToast(error, mockToast);

      const { description, variant } = mockToast.mock.calls[0][0];
      expect(variant).toBe("destructive");
      // Should get the same branded message, not the raw detail
      expect(description).not.toBe("Something broke");
    });

    it("includes retry guidance in description", () => {
      const error = makeApiClientError(502, "UNEXPECTED", "Bad Gateway");

      showErrorToast(error, mockToast);

      const { description } = mockToast.mock.calls[0][0];
      expect(description).toMatch(/再試/);
    });
  });

  describe("operational errors → user-actionable detail passthrough", () => {
    it("passes error.detail as description for 404 NOT_FOUND", () => {
      const error = makeApiClientError(404, "NOT_FOUND", "找不到指定的隊伍");

      showErrorToast(error, mockToast);

      expect(mockToast.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          description: "找不到指定的隊伍",
          variant: "destructive",
        }),
      );
    });

    it("passes error.detail as description for 409 CONFLICT", () => {
      const error = makeApiClientError(409, "CONFLICT", "該名稱已被使用");

      showErrorToast(error, mockToast);

      expect(mockToast.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          description: "該名稱已被使用",
          variant: "destructive",
        }),
      );
    });
  });

  describe("RefreshTimeoutError → 連線逾時 message", () => {
    it("shows 連線逾時 title and retry description for RefreshTimeoutError", () => {
      showErrorToast(new RefreshTimeoutError(), mockToast);

      expect(mockToast).toHaveBeenCalledWith({
        title: "連線逾時",
        description: "請稍後再試，若問題持續請確認網路連線。",
        variant: "destructive",
      });
    });
  });

  describe("401 errors → no toast (handle401Redirect owns this case)", () => {
    it("does NOT call toast for status 401 ApiClientError", () => {
      const error = makeApiClientError(401, "AUTHENTICATION", "Authentication is required");
      showErrorToast(error, mockToast);
      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe("unknown errors → generic fallback", () => {
    it("shows fallback toast for non-ApiClientError", () => {
      showErrorToast(
        new TypeError("Cannot read properties of undefined"),
        mockToast,
      );

      const { variant, description } = mockToast.mock.calls[0][0];
      expect(variant).toBe("destructive");
      // Should not leak internal error message to user
      expect(description).not.toContain("Cannot read properties");
    });

    it("shows fallback toast for non-Error values (string, null, etc.)", () => {
      showErrorToast("some string error", mockToast);
      expect(mockToast.mock.calls[0][0].variant).toBe("destructive");

      mockToast.mockClear();
      showErrorToast(null, mockToast);
      expect(mockToast.mock.calls[0][0].variant).toBe("destructive");
    });
  });
});
