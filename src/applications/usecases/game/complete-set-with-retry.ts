import type {
  EntryRef,
  IGameRepository,
} from "@/applications/repositories/game.repository.interface";
import { TransientError } from "@/entities/errors";

/**
 * D2: completeSet retries inline, inside the same request, before the
 * response is sent. Three attempts, growing pauses — chosen because this is
 * an idempotent write of a derived value that fires at most once per set, so
 * a few hundred extra milliseconds are invisible against a wait the recorder
 * is already in.
 */
export const COMPLETE_SET_RETRY_DELAYS_MS = [50, 200, 500];

function isRetryable(error: unknown): boolean {
  return error instanceof TransientError && error.retryable === true;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Writes the set result, retrying on a retryable failure per
 * `COMPLETE_SET_RETRY_DELAYS_MS`. Returns whether the write ultimately
 * succeeded; never throws, since a failing set-result write must not
 * discard the entries the caller already persisted.
 */
export async function completeSetWithRetry(
  gameRepository: IGameRepository,
  ref: EntryRef,
  win: boolean | null,
  gameWin: boolean | null | undefined,
): Promise<boolean> {
  for (let attempt = 0; ; attempt++) {
    try {
      await gameRepository.completeSet(ref, win, gameWin);
      return true;
    } catch (error) {
      const delay = COMPLETE_SET_RETRY_DELAYS_MS[attempt];
      if (delay === undefined || !isRetryable(error)) return false;
      await wait(delay);
    }
  }
}
