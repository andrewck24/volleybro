"use client";
import { useCallback, useState } from "react";
import { useGame } from "@/hooks/use-data";
import { EntryType } from "@/entities/game";
import { flushPendingWrites } from "@/lib/features/game/actions/flush-pending-writes";
import { applyFlushedEntries } from "@/lib/features/game/pending-writes";
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
  const flushing = useAppSelector((state) => state.pendingWrites.flushing);
  // `flushing` is a global flag -- a flush triggered by an entry belonging
  // to a different game or set must not be read as this set's signal.
  const hasPendingEntryForSet = useAppSelector((state) =>
    state.pendingWrites.pending.some(
      (p) => p.gameId === gameId && p.setIndex === setIndex,
    ),
  );

  const set = game?.sets[setIndex];
  const noSessionSignalYet = sessionConfirmed === undefined;
  const coldStartUnconfirmed = noSessionSignalYet && set?.win === null;
  // The moment Interval mounts right after the set-ending submit, no
  // session signal has arrived yet either -- `flushing` is what tells the
  // dialog to cover the screen for that window instead of staying hidden
  // until the response settles.
  const attempting =
    retrying || (noSessionSignalYet && flushing && hasPendingEntryForSet);
  const unconfirmed =
    sessionConfirmed === false || coldStartUnconfirmed || attempting;

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
    }
    setRetrying(false);
  }, [dispatch, gameId, mutate, set, setIndex]);

  return { unconfirmed, attempting, retry };
}
