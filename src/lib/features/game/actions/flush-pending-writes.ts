import { ApiClientError, apiClient } from "@/lib/api/api-client";
import {
  PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS,
  isRetryableStatus,
} from "@/lib/features/game/pending-writes";
import type {
  PendingEntry,
  EntryWriteResponse,
  WriteError,
} from "@/lib/features/game/types";
import { withRetry, type RetryOutcome } from "@/lib/retry";

function isRetryable(error: unknown): boolean {
  return error instanceof ApiClientError && isRetryableStatus(error.status);
}

export function toWriteError(error: unknown): WriteError | undefined {
  return error instanceof ApiClientError
    ? { code: error.code, reason: error.reason, status: error.status }
    : undefined;
}

export async function flushPendingWrites(
  gameId: string,
  setIndex: number,
  entries: PendingEntry["entry"][],
): Promise<RetryOutcome<EntryWriteResponse>> {
  return withRetry(PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS, isRetryable, () =>
    apiClient<EntryWriteResponse>(
      `/api/games/${gameId}/sets/entries?si=${setIndex}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
      },
    ),
  );
}
