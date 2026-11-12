"use client";
import { useCallback, useState } from "react";
import { useGame } from "@/hooks/use-data";
import { EntryType } from "@/entities/game";
import { flushPendingWrites } from "@/lib/features/game/actions/flush-pending-writes";
import { applyFlushedEntries } from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import {
  readSetCompletion,
  setCompletionActions,
} from "@/lib/features/game/set-completion-slice";
import type { EntryView } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

export function useUnconfirmedSetCompletion(gameId: string, setIndex: number) {
  const dispatch = useAppDispatch();
  const { game, mutate } = useGame(gameId);
  const [retrying, setRetrying] = useState(false);
  const sessionConfirmed = useAppSelector((state) =>
    readSetCompletion(state.setCompletion, gameId, setIndex),
  );

  const hasScheduledAttemptForSet = useAppSelector((state) =>
    state.pendingWrites.pending.some(
      (p) =>
        p.gameId === gameId &&
        p.setIndex === setIndex &&
        p.nextAttemptAt !== null,
    ),
  );

  const hasPendingEntryForSet = useAppSelector((state) =>
    state.pendingWrites.pending.some(
      (p) => p.gameId === gameId && p.setIndex === setIndex,
    ),
  );

  const set = game?.sets[setIndex];
  const noSessionSignalYet = sessionConfirmed === undefined;
  const coldStartUnconfirmed = noSessionSignalYet && set?.win === null;

  const attempting =
    retrying || (noSessionSignalYet && hasScheduledAttemptForSet);

  const unconfirmed =
    sessionConfirmed === false ||
    coldStartUnconfirmed ||
    retrying ||
    (noSessionSignalYet && hasPendingEntryForSet);

  const retry = useCallback(async () => {
    const lastRally = set?.entries.findLast(
      (
        entry,
      ): entry is Extract<EntryView, { type: EntryType.RALLY }> & {
        at?: string;
      } => entry.type === EntryType.RALLY,
    );
    if (!lastRally) return;

    setRetrying(true);

    const {
      recordedBy: _recordedBy,
      recordedAt,
      at,
      editedBy: _editedBy,
      editedAt: _editedAt,
      ...pendingEntry
    } = lastRally;
    const result = await flushPendingWrites(gameId, setIndex, [
      { ...pendingEntry, at: recordedAt ?? at ?? new Date().toISOString() },
    ]);
    if (result.ok) {
      mutate(
        (current) =>
          applyFlushedEntries(current, setIndex, result.value.entries),
        { revalidate: false },
      );

      dispatch(
        setCompletionActions.recorded({
          gameId,
          setIndex,
          confirmed: result.value.setCompletionConfirmed ?? true,
        }),
      );

      dispatch(pendingWritesActions.flushSucceeded({ ids: [lastRally.id] }));
    }
    setRetrying(false);
  }, [dispatch, gameId, mutate, set, setIndex]);

  return { unconfirmed, attempting, retry };
}
