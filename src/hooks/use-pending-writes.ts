"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useGame, useUser } from "@/hooks/use-data";
import {
  flushPendingWrites,
  toWriteError,
} from "@/lib/features/game/actions/flush-pending-writes";
import {
  applyFlushedEntries,
  isQueuedBy,
} from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import {
  recalledRecorder,
  rememberRecorder,
} from "@/lib/features/game/pending-writes-storage";
import { setCompletionActions } from "@/lib/features/game/set-completion-slice";
import type { PendingEntry } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";

type FlushFailedPayload = Parameters<
  typeof pendingWritesActions.flushFailed
>[0];

export type FlushResult = { ok: true } | { ok: false; error: unknown };

export function usePendingWrites(gameId: string, setIndex: number) {
  const sessionUserId = useUser().user?.id;
  useEffect(() => {
    if (sessionUserId) rememberRecorder(sessionUserId);
  }, [sessionUserId]);
  const userId = sessionUserId ?? recalledRecorder();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { mutate } = useGame(gameId);
  const inFlight = useRef<Promise<FlushResult> | null>(null);

  const runFlush = useCallback(async (): Promise<FlushResult> => {
    const bySetIndex = new Map<number, PendingEntry[]>();
    for (const p of store.getState().pendingWrites.pending) {
      if (p.gameId !== gameId || !isQueuedBy(p, userId)) continue;
      const items = bySetIndex.get(p.setIndex) ?? [];
      items.push(p);
      bySetIndex.set(p.setIndex, items);
    }
    if (bySetIndex.size === 0) return { ok: true };

    const succeededIds: string[] = [];
    const failures: { payload: FlushFailedPayload; error: unknown }[] = [];

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
        failures.push({
          payload: {
            ids,
            retryable: result.retryable,
            lastError: toWriteError(result.error),
          },
          error: result.error,
        });
      }
    }

    if (succeededIds.length > 0) {
      dispatch(pendingWritesActions.flushSucceeded({ ids: succeededIds }));
    }
    for (const { payload } of failures) {
      dispatch(pendingWritesActions.flushFailed(payload));
    }

    const [firstFailure] = failures;
    return firstFailure === undefined
      ? { ok: true }
      : { ok: false, error: firstFailure.error };
  }, [dispatch, gameId, mutate, store, userId]);

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
      dispatch(
        pendingWritesActions.enqueued({ entry, gameId, setIndex, userId }),
      );
    },
    [dispatch, gameId, setIndex, userId],
  );

  const retry = useCallback((): Promise<FlushResult> => {
    dispatch(pendingWritesActions.retryRequested({ gameId, userId }));
    return flush();
  }, [dispatch, flush, gameId, userId]);

  const earliestNextAttempt = useAppSelector((state) => {
    const due = state.pendingWrites.pending
      .filter(
        (p) =>
          p.gameId === gameId &&
          isQueuedBy(p, userId) &&
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

  return { enqueue, flush, retry };
}

export type PendingWritesApi = ReturnType<typeof usePendingWrites>;

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
