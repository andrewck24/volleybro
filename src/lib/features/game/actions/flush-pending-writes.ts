import { ApiClientError, apiClient } from "@/lib/api/api-client";
import { PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS } from "@/lib/features/game/pending-writes";
import type { RecordRalliesResponse } from "@/lib/features/game/types";
import type { PendingEntry } from "@/lib/features/game/types";
import { withRetry } from "@/lib/retry";

function isRetryable(error: unknown): boolean {
  return error instanceof ApiClientError && error.status >= 500;
}

export type FlushOutcome =
  | { ok: true; response: RecordRalliesResponse }
  | { ok: false; retryable: boolean; error: unknown };

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
): Promise<FlushOutcome> {
  const result = await withRetry(
    PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS,
    isRetryable,
    () =>
      apiClient<RecordRalliesResponse>(
        `/api/games/${gameId}/sets/rallies?si=${setIndex}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entries),
        },
      ),
  );
  return result.ok
    ? { ok: true, response: result.value }
    : { ok: false, retryable: result.retryable, error: result.error };
}
