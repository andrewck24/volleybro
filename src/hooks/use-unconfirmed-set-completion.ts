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

/**
 * Whether `completeSet` landed for (gameId, setIndex) has two detections
 * that cannot share one mechanism:
 *
 * - Submission time: the local cache is already optimistically written to
 *   match entries, so comparing it against itself would always agree --
 *   `setCompletion` (recorded from the flush response) is the only usable
 *   signal, and it lives only for this session.
 * - Cold start: there is no response to read, so the freshly fetched `win`
 *   is compared against the fact entries already imply the set is over --
 *   which is exactly the precondition for this hook being called at all
 *   (Interval only renders once `deriveSetPhase` says the set is over), so
 *   the comparison collapses to "is the fetched win still null".
 */
export function useUnconfirmedSetCompletion(gameId: string, setIndex: number) {
  const dispatch = useAppDispatch();
  const { game, mutate } = useGame(gameId);
  const [retrying, setRetrying] = useState(false);
  const sessionConfirmed = useAppSelector((state) =>
    readSetCompletion(state.setCompletion, gameId, setIndex),
  );
  // Same rule deriveSyncStatus uses: a scheduled attempt counts as work in
  // progress, not only a request literally on the wire -- an item sits with
  // nextAttemptAt !== null for its whole in-flight-or-backoff life, so this
  // one check covers both without needing to know whether a flush happens
  // to be in flight right now. Scoped to this exact (gameId, setIndex): a
  // flush covers every pending set of this game (see usePendingWrites), so
  // game identity alone would wrongly pick up a different set's entry.
  const hasScheduledAttemptForSet = useAppSelector((state) =>
    state.pendingWrites.pending.some(
      (p) =>
        p.gameId === gameId &&
        p.setIndex === setIndex &&
        p.nextAttemptAt !== null,
    ),
  );

  // An entry whose backoff is spent stays queued with a null nextAttemptAt,
  // and nothing will send it now except the recorder pressing retry.
  const hasPendingEntryForSet = useAppSelector((state) =>
    state.pendingWrites.pending.some(
      (p) => p.gameId === gameId && p.setIndex === setIndex,
    ),
  );

  const set = game?.sets[setIndex];
  const noSessionSignalYet = sessionConfirmed === undefined;
  const coldStartUnconfirmed = noSessionSignalYet && set?.win === null;
  // The moment Interval mounts right after the set-ending submit, no
  // session signal has arrived yet either -- `hasScheduledAttemptForSet` is
  // what tells the dialog to cover the screen for that window (and for the
  // whole backoff window after a failed attempt) instead of dropping in and
  // out between attempts.
  const attempting =
    retrying || (noSessionSignalYet && hasScheduledAttemptForSet);
  // The optimistic write already put `win` on the cached set, so the queue
  // is the only remaining evidence that the result never landed.
  const unconfirmed =
    sessionConfirmed === false ||
    coldStartUnconfirmed ||
    retrying ||
    (noSessionSignalYet && hasPendingEntryForSet);

  const retry = useCallback(async () => {
    const lastRally = set?.entries.findLast(
      (entry): entry is Extract<EntryView, { type: EntryType.RALLY }> =>
        entry.type === EntryType.RALLY,
    );
    if (!lastRally) return;

    setRetrying(true);
    const { type: _type, ...pendingEntry } = lastRally;
    const result = await flushPendingWrites(gameId, setIndex, [pendingEntry]);
    if (result.ok) {
      mutate(
        (current) =>
          applyFlushedEntries(current, setIndex, result.response.entries),
        { revalidate: false },
      );
      // The response can omit the field when a different attempt already
      // matched the derived result in the meantime -- that is itself a
      // confirmation, not silence.
      dispatch(
        setCompletionActions.recorded({
          gameId,
          setIndex,
          confirmed: result.response.setCompletionConfirmed ?? true,
        }),
      );
      // This retry sends the entry itself rather than going through flush,
      // so nothing else takes it out of the queue.
      dispatch(
        pendingWritesActions.flushSucceeded({ gameId, ids: [lastRally.id] }),
      );
    }
    setRetrying(false);
  }, [dispatch, gameId, mutate, set, setIndex]);

  return { unconfirmed, attempting, retry };
}
