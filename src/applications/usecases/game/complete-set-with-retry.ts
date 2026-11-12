import type {
  EntryRef,
  IGameRepository,
} from "@/applications/repositories/game.repository.interface";
import { TransientError } from "@/entities/errors";
import { withRetry } from "@/lib/retry";

export const COMPLETE_SET_RETRY_DELAYS_MS = [50, 200, 500];

function isRetryable(error: unknown): boolean {
  return error instanceof TransientError && error.retryable === true;
}

export async function completeSetWithRetry(
  gameRepository: IGameRepository,
  ref: EntryRef,
  win: boolean | null,
  gameWin: boolean | null | undefined,
): Promise<boolean> {
  const result = await withRetry(
    COMPLETE_SET_RETRY_DELAYS_MS,
    isRetryable,
    () => gameRepository.completeSet(ref, win, gameWin),
  );
  return result.ok;
}
