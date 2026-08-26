"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useGame } from "@/hooks/use-data";
import { flushPendingWrites } from "@/lib/features/game/actions/flush-pending-writes";
import { applyFlushedEntries } from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { setCompletionActions } from "@/lib/features/game/set-completion-slice";
import type { PendingEntry } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";

export type FlushResult = { ok: true } | { ok: false; error: unknown };

/**
 * The pending-write queue is the single source of truth for what the
 * server has not confirmed. This hook owns enqueueing new writes for one
 * (gameId, setIndex) and flushing the queue — on demand (submit, reconnect)
 * and in the background once an entry's backoff comes due.
 *
 * A flush covers every set still pending for this game, not only the one
 * currently being recorded: the rally endpoint is scoped per set (`si`), so
 * a flush groups the queue by setIndex and sends one request per group.
 * Without this, an entry left over from a set the recorder has since moved
 * past would stay queued forever — counted by SyncIndicator but never
 * reachable by its retry.
 */
export function usePendingWrites(gameId: string, setIndex: number) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { mutate } = useGame(gameId);
  const inFlight = useRef<Promise<FlushResult> | null>(null);

  const runFlush = useCallback(async (): Promise<FlushResult> => {
    const bySetIndex = new Map<number, PendingEntry[]>();
    for (const p of store.getState().pendingWrites.pending) {
      if (p.gameId !== gameId) continue;
      const items = bySetIndex.get(p.setIndex) ?? [];
      items.push(p);
      bySetIndex.set(p.setIndex, items);
    }
    if (bySetIndex.size === 0) return { ok: true };

    dispatch(pendingWritesActions.flushStarted({ gameId }));

    const succeededIds: string[] = [];
    const failedIdsByRetryable = new Map<boolean, string[]>();
    let firstError: unknown;

    for (const [si, items] of bySetIndex) {
      const ids = items.map((p) => p.entry.id);
      const result = await flushPendingWrites(
        gameId,
        si,
        items.map((p) => p.entry),
      );
      if (result.ok) {
        succeededIds.push(...ids);
        mutate(
          (current) => applyFlushedEntries(current, si, result.value.entries),
          { revalidate: false },
        );
        // The response is the only place this fact exists at submission
        // time -- the local cache is already optimistically written to
        // match entries, so comparing it against itself would never catch a
        // completeSet failure. Undefined means no set result was attempted.
        if (result.value.setCompletionConfirmed !== undefined) {
          dispatch(
            setCompletionActions.recorded({
              gameId,
              setIndex: si,
              confirmed: result.value.setCompletionConfirmed,
            }),
          );
        }
      } else {
        firstError ??= result.error;
        failedIdsByRetryable.set(result.retryable, [
          ...(failedIdsByRetryable.get(result.retryable) ?? []),
          ...ids,
        ]);
      }
    }

    if (succeededIds.length > 0) {
      dispatch(
        pendingWritesActions.flushSucceeded({ gameId, ids: succeededIds }),
      );
    }
    for (const [retryable, ids] of failedIdsByRetryable) {
      dispatch(pendingWritesActions.flushFailed({ gameId, ids, retryable }));
    }

    return failedIdsByRetryable.size === 0
      ? { ok: true }
      : { ok: false, error: firstError };
  }, [dispatch, gameId, mutate, store]);

  // Only one flush in flight at a time; callers that ask for a flush while
  // one is running get the same promise rather than a second overlapping
  // request. Whatever they enqueued rides along on the next flush instead.
  const flush = useCallback((): Promise<FlushResult> => {
    if (!inFlight.current) {
      inFlight.current = runFlush().finally(() => {
        inFlight.current = null;
      });
    }
    return inFlight.current;
  }, [runFlush]);

  const enqueue = useCallback(
    (entry: PendingEntry["entry"]) => {
      dispatch(pendingWritesActions.enqueued({ entry, gameId, setIndex }));
    },
    [dispatch, gameId, setIndex],
  );

  // The one retry gesture: reset this game's exhausted items' backoff and
  // flush.
  const retry = useCallback((): Promise<FlushResult> => {
    dispatch(pendingWritesActions.retryRequested({ gameId }));
    return flush();
  }, [dispatch, flush, gameId]);

  // Background retry: schedule the next flush for whenever the earliest
  // still-pending item comes due, and re-flush as soon as connectivity
  // returns so an entry queued while offline is written once, not lost.
  // Scoped to the game, not the current set, for the same reason runFlush
  // is: an item from a set the recorder has moved past must still get
  // scheduled.
  const earliestNextAttempt = useAppSelector((state) => {
    const due = state.pendingWrites.pending
      .filter((p) => p.gameId === gameId && p.nextAttemptAt !== null)
      .map((p) => p.nextAttemptAt as number);
    return due.length === 0 ? null : Math.min(...due);
  });

  useEffect(() => {
    if (earliestNextAttempt === null) return;
    const delay = Math.max(0, earliestNextAttempt - Date.now());
    const timer = setTimeout(() => void flush(), delay);
    return () => clearTimeout(timer);
  }, [earliestNextAttempt, flush]);

  useEffect(() => {
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flush]);

  return { enqueue, flush, retry };
}

export type PendingWritesApi = ReturnType<typeof usePendingWrites>;

/**
 * `usePendingWrites` owns an `inFlight` ref and a background-retry timer, so
 * it must be mounted exactly once per game -- `Game` (`src/components/game/
 * index.tsx`) is that single owner. Everything below it that needs `enqueue`,
 * `flush`, or `retry` reads them from this context instead of mounting its
 * own instance, which would each fire an independent flush for the same due
 * entry.
 */
export const PendingWritesContext = createContext<PendingWritesApi | null>(
  null,
);

export function usePendingWritesContext(): PendingWritesApi {
  const context = useContext(PendingWritesContext);
  if (!context) {
    throw new Error(
      "usePendingWritesContext must be used within a PendingWritesContext.Provider",
    );
  }
  return context;
}
