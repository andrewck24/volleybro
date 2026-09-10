import { ApiClientError } from "@/lib/api/api-client";
import {
  handle401Redirect,
  resolveErrorDisplay,
  showErrorToast,
} from "@/lib/api/error-toast";
import { RefreshTimeoutError } from "@/hooks/use-pull-to-refresh";
import type { ApiError } from "@/lib/api/parse-api-error";

const makeApiClientError = (
  status: number,
  code: string,
  detail: string,
  reason = "TEST",
): ApiClientError => {
  const info: ApiError = {
    code: code as ApiError["code"],
    reason,
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

  it("shows 登入逾期 destructive toast", () => {
    handle401Redirect(mockRouter, mockToast);

    expect(mockToast).toHaveBeenCalledWith({
      title: "登入逾期",
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

describe("resolveErrorDisplay", () => {
  it("resolves RefreshTimeoutError to NETWORK_TIMEOUT", () => {
    expect(resolveErrorDisplay(new RefreshTimeoutError())).toEqual({
      title: "連線逾時",
      description: "請稍後再試，若問題持續請確認網路連線",
    });
  });

  it("resolves a non-ApiClientError to UNKNOWN", () => {
    expect(resolveErrorDisplay(new TypeError("boom"))).toEqual({
      title: "發生未預期的錯誤",
      description: "請重新整理頁面後再試一次，若問題持續請聯繫我們",
    });
    expect(resolveErrorDisplay("some string error").title).toBe(
      "發生未預期的錯誤",
    );
    expect(resolveErrorDisplay(null).title).toBe("發生未預期的錯誤");
  });

  it("resolves status 401 to SESSION_EXPIRED regardless of reason", () => {
    const error = makeApiClientError(401, "AUTHENTICATION", "unauthorized");
    expect(resolveErrorDisplay(error).title).toBe("登入逾期");
  });

  it("resolves client-invented TIMEOUT/NETWORK_ERROR reasons to NETWORK_TIMEOUT before the 5xx branch", () => {
    // normalizeNetworkError stamps status 503 on these, which would
    // otherwise fall into the server-error branch.
    const timeout = makeApiClientError(503, "TRANSIENT", "timeout", "TIMEOUT");
    const network = makeApiClientError(
      503,
      "TRANSIENT",
      "network",
      "NETWORK_ERROR",
    );
    expect(resolveErrorDisplay(timeout).title).toBe("連線逾時");
    expect(resolveErrorDisplay(network).title).toBe("連線逾時");
  });

  it("resolves status >= 500 or code UNEXPECTED to SERVER_ERROR", () => {
    expect(
      resolveErrorDisplay(makeApiClientError(500, "UNEXPECTED", "x")).title,
    ).toBe("哎呀，發球掛網！");
    expect(
      resolveErrorDisplay(makeApiClientError(422, "UNEXPECTED", "x")).title,
    ).toBe("哎呀，發球掛網！");
  });

  it("resolves a known reason to its catalogue entry", () => {
    const error = makeApiClientError(
      404,
      "NOT_FOUND",
      "Team not found",
      "RESOURCE_NOT_FOUND",
    );
    expect(resolveErrorDisplay(error)).toEqual({
      title: "找不到資料",
      description: "這筆資料可能已被刪除，請重新整理後再試",
    });
  });

  it("fail-closed: an unmapped reason on a 4xx status resolves to UNKNOWN", () => {
    const error = makeApiClientError(
      409,
      "CONFLICT",
      "此名稱已被使用",
      "DUPLICATE_NAME",
    );
    expect(resolveErrorDisplay(error)).toEqual({
      title: "發生未預期的錯誤",
      description: "請重新整理頁面後再試一次，若問題持續請聯繫我們",
    });
  });

  it("the toast surface and the inline-dialog surface agree on one failure", () => {
    const error = makeApiClientError(
      404,
      "NOT_FOUND",
      "Team not found",
      "RESOURCE_NOT_FOUND",
    );

    const mockToast = jest.fn();
    showErrorToast(error, mockToast); // toast path
    const toastDescription = mockToast.mock.calls[0][0].description;

    const dialogDescription = resolveErrorDisplay(error).description; // dialog path

    expect(toastDescription).toBe(dialogDescription);
  });
});

describe("showErrorToast", () => {
  let mockToast: jest.Mock;

  beforeEach(() => {
    mockToast = jest.fn();
  });

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

  it("shows a destructive toast for a 401 (SESSION_EXPIRED)", () => {
    const error = makeApiClientError(401, "AUTHENTICATION", "unauthorized");
    showErrorToast(error, mockToast);

    expect(mockToast).toHaveBeenCalledWith({
      title: "登入逾期",
      description: "請重新登入",
      variant: "destructive",
    });
  });

  it("shows 連線逾時 for RefreshTimeoutError", () => {
    showErrorToast(new RefreshTimeoutError(), mockToast);

    expect(mockToast).toHaveBeenCalledWith({
      title: "連線逾時",
      description: "請稍後再試，若問題持續請確認網路連線",
      variant: "destructive",
    });
  });

  it("shows fallback toast for non-ApiClientError, without leaking the raw message", () => {
    showErrorToast(
      new TypeError("Cannot read properties of undefined"),
      mockToast,
    );

    const { variant, description } = mockToast.mock.calls[0][0];
    expect(variant).toBe("destructive");
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
