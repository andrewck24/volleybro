import { type ApiError, parseApiError } from "@/lib/api/parse-api-error";

export { type ApiError };

export const API_UNAUTHORIZED_EVENT = "api:unauthorized" as const;

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly info: ApiError,
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  get code() {
    return this.info.code;
  }
  get reason() {
    return this.info.reason;
  }
  get detail() {
    return this.info.detail;
  }
  get details() {
    return this.info.details;
  }
  get status() {
    return this.info.status;
  }
}

const DEFAULT_TIMEOUT_MS = 8000;

function normalizeNetworkError(error: unknown): ApiClientError {
  const isTimeout =
    error instanceof DOMException && error.name === "TimeoutError";
  const reason = isTimeout ? "TIMEOUT" : "NETWORK_ERROR";
  const detail = isTimeout ? "Request timed out" : "Network request failed";

  return new ApiClientError(detail, {
    code: "TRANSIENT",
    reason,
    detail,
    status: 503,
  });
}

export async function apiClient<T = unknown>(
  url: string,
  options?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw normalizeNetworkError(error);
  }

  if (!res.ok) {
    const info = await parseApiError(res);
    if (res.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(API_UNAUTHORIZED_EVENT));
    }
    throw new ApiClientError(info.detail, info);
  }

  return res.json();
}
