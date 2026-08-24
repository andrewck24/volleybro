"use client";
import { useCallback, useEffect, useRef } from "react";
import { useGame } from "@/hooks/use-data";
import { flushPendingWrites } from "@/lib/features/game/actions/flush-pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import type { GameView, PendingEntry } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";

export type FlushResult = { ok: true } | { ok: false; error: unknown };

const applyFlushedEntries = (
  game: GameView | undefined,
  setIndex: number,
  entries: GameView["sets"][number]["entries"],
): GameView | undefined =>
  game && {
    ...game,
    sets: game.sets.map((set, i) =>
      i === setIndex ? { ...set, entries } : set,
    ),
  };

/**
 * D4: the pending-write queue is the single source of truth for what the
 * server has not confirmed. This hook owns enqueueing new writes and
 * flushing the queue for one (gameId, setIndex) — on demand (submit,
 * reconnect) and in the background once an entry's backoff comes due.
 */
export function usePendingWrites(gameId: string, setIndex: number) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { mutate } = useGame(gameId);
  const inFlight = useRef<Promise<FlushResult> | null>(null);

  const runFlush = useCallback(async (): Promise<FlushResult> => {
    const items = store
      .getState()
      .pendingWrites.pending.filter(
        (p) => p.gameId === gameId && p.setIndex === setIndex,
      );
    if (items.length === 0) return { ok: true };

    dispatch(pendingWritesActions.flushStarted());
    const ids = items.map((p) => p.entry.id);
    const result = await flushPendingWrites(
      gameId,
      setIndex,
      items.map((p) => p.entry),
    );

    if (result.ok) {
      dispatch(pendingWritesActions.flushSucceeded({ ids }));
      mutate(
        (current) =>
          applyFlushedEntries(current, setIndex, result.response.entries),
        { revalidate: false },
      );
      return { ok: true };
    }

    dispatch(
      pendingWritesActions.flushFailed({ ids, retryable: result.retryable }),
    );
    return { ok: false, error: result.error };
  }, [dispatch, gameId, setIndex, mutate, store]);

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

  // Background retry: schedule the next flush for whenever the earliest
  // still-pending item comes due, and re-flush as soon as connectivity
  // returns so an entry queued while offline is written once, not lost.
  const earliestNextAttempt = useAppSelector((state) => {
    const due = state.pendingWrites.pending
      .filter(
        (p) =>
          p.gameId === gameId &&
          p.setIndex === setIndex &&
          p.nextAttemptAt !== null,
      )
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

  return { enqueue, flush };
}
