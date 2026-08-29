import { ApiClientError, apiClient } from "@/lib/api/api-client";
import { PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS } from "@/lib/features/game/pending-writes";
import type {
  PendingEntry,
  RecordRalliesResponse,
  WriteError,
} from "@/lib/features/game/types";
import { withRetry, type RetryOutcome } from "@/lib/retry";

function isRetryable(error: unknown): boolean {
  return error instanceof ApiClientError && error.status >= 500;
}

/**
 * Narrows a failure to the part the queue keeps. Undefined for anything that
 * is not an ApiClientError -- the queue records that it failed and that the
 * reason is unknown, rather than inventing one. Network and timeout failures
 * do not take that path: apiClient normalizes them into an ApiClientError of
 * status 503 before they get here.
 */
export function toWriteError(error: unknown): WriteError | undefined {
  return error instanceof ApiClientError
    ? { code: error.code, reason: error.reason, status: error.status }
    : undefined;
}

/**
 * Sends one batch of entries to the rally endpoint (the queue's flush, not
 * the individual submit, owns the network). Retries a retryable failure
 * inline per PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS before handing off to
 * the queue's own background backoff; a 4xx is never retried.
 */
export async function flushPendingWrites(
  gameId: string,
  setIndex: number,
  entries: PendingEntry["entry"][],
): Promise<RetryOutcome<RecordRalliesResponse>> {
  return withRetry(PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS, isRetryable, () =>
    apiClient<RecordRalliesResponse>(
      `/api/games/${gameId}/sets/rallies?si=${setIndex}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
      },
    ),
  );
}
