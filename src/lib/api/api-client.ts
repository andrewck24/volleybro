import { type ApiError, parseApiError } from "@/lib/api/parse-api-error";

export { type ApiError };

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

export async function apiClient<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    const info = await parseApiError(res);
    throw new ApiClientError(info.detail, info);
  }

  return res.json();
}
