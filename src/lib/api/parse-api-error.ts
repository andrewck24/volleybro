import { type AppErrorCode } from "@/entities/errors";

export interface ApiError {
  code: AppErrorCode;
  reason: string;
  detail: string;
  details?: unknown[];
  status: number;
}

export async function parseApiError(res: Response): Promise<ApiError> {
  const status = res.status;

  try {
    const body = await res.json();
    if (
      body &&
      typeof body.code === "string" &&
      typeof body.reason === "string"
    ) {
      return {
        code: body.code,
        reason: body.reason,
        detail: body.detail ?? "An error occurred",
        details: body.details,
        status,
      };
    }
  } catch {
    // Response body is not JSON — fall through to default
  }

  return {
    code: "UNEXPECTED",
    reason: "UNHANDLED_ERROR",
    detail: `Request failed with status ${status}`,
    status,
  };
}
