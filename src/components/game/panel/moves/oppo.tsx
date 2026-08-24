"use client";
import { Container, MoveButton } from "@/components/game/panel/moves";
import { useGame } from "@/hooks/use-data";
import { usePendingWrites } from "@/hooks/use-pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import {
  createRallyHelper,
  updateRallyHelper,
} from "@/lib/features/game/helpers";
import type { RallyView } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { scoringMoves, type ScoringMove } from "@/lib/scoring-moves";
import { FiMinus, FiPlus } from "react-icons/fi";

/**
 * The real entry-submission path: creates a new rally (mode "general") or
 * persists an edit (mode "editing") via the optimistic helpers, then hands
 * the entry to the pending-write queue instead of sending it itself. Shared
 * by OppoMoves' own "tap the same move again" submit and by the Preview's
 * tap-to-submit gesture so the Preview's freeze actually persists the entry
 * instead of just flashing.
 */
export const useSubmitEntryDraft = (gameId: string) => {
  const dispatch = useAppDispatch();
  const { setIndex, mode } = useAppSelector((state) => state.game);
  const {
    status: { entryIndex },
    entryDraft: draft,
  } = useAppSelector((state) => state.game[mode]);
  const { game, mutate } = useGame(gameId);
  const { enqueue, flush } = usePendingWrites(gameId, setIndex);

  // Create advances the draft the instant the entry is enqueued, without
  // waiting for the server -- the queue's own retry and the sync indicator
  // are what make that safe. The optimistic cache write no longer carries
  // the request; the queue's flush owns the network and updates the cache
  // again once it has a response.
  const create = () => {
    // A new rally always gets a fresh identity, generated here so it exists
    // before the optimistic update below applies it.
    const entry = {
      ...(draft as RallyView),
      id: crypto.randomUUID(),
      seq: entryIndex,
    };
    const { game: updatedGame, phase } = createRallyHelper(
      { gameId, setIndex, entryIndex },
      entry,
      game!,
    );
    mutate(updatedGame, { revalidate: false });
    enqueue(entry);
    dispatch(gameActions.confirmEntryDraftRally(phase));
    void flush();
  };

  // Editing still waits for its result -- the recorder is watching a dialog
  // for it, unlike create's already-advanced draft.
  const update = async () => {
    // Editing reuses the identity setEditingEntryStatus loaded onto the
    // draft; the entry being replaced must keep the same id.
    const entry = { ...(draft as RallyView), id: draft.id, seq: draft.seq };
    const { game: updatedGame, phase } = updateRallyHelper(
      { gameId, setIndex, entryIndex },
      entry,
      game!,
    );
    mutate(updatedGame, { revalidate: false });
    enqueue(entry);
    const result = await flush();
    if (!result.ok) {
      // Not thrown, not rolled back, no toast: the editing card (mode
      // "editing" of GamePreview) is what shows this now -- syncing while
      // the queue still has an attempt scheduled, the destructive ring once
      // exhausted. The recorder is still watching the dialog, and the
      // optimistic write stays visible as the edit they're waiting on.
      return;
    }
    dispatch(gameActions.confirmEntryDraftRally(phase));
    dispatch(gameActions.setGameMode("general"));
  };

  return async () => {
    if (mode === "general") {
      create();
    } else {
      await update();
    }
  };
};

export const OppoMoves = () => {
  const dispatch = useAppDispatch();
  const { mode } = useAppSelector((state) => state.game);
  const { entryDraft: draft } = useAppSelector((state) => state.game[mode]);

  const oppoMoves = scoringMoves.filter((option) =>
    scoringMoves[draft.home.num ?? -1]?.outcome.includes(option.num),
  );

  // Selecting an away move only stages it in the draft; submission is owned by
  // the Preview's send affordance (`entry-ui` change), so there is no
  // second-tap-to-submit here anymore.
  const onOppoClick = (move: ScoringMove) => {
    dispatch(gameActions.setEntryDraftAwayMove(move));
  };

  return (
    <Container className="grid-cols-1">
      {oppoMoves.map((move) => (
        <MoveButton
          key={`${move.type}-${move.num + 15}`}
          move={move}
          toggled={draft.away.num === move.num}
          onClick={() => onOppoClick(move)}
        >
          {move.type === 7 ? `我方${move.text}失誤` : `對方${move.text}`}
          {move.win ? <FiPlus /> : <FiMinus />}
        </MoveButton>
      ))}
    </Container>
  );
};
