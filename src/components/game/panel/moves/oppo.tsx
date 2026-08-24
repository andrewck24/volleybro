"use client";
import { Container, MoveButton } from "@/components/game/panel/moves";
import { useToast } from "@/components/ui/use-toast";
import { useGame } from "@/hooks/use-data";
import { showErrorToast } from "@/lib/api/error-toast";
import { createRally } from "@/lib/features/game/actions/create-rally";
import { updateRally } from "@/lib/features/game/actions/update-rally";
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
 * persists an edit (mode "editing") via the optimistic helpers + API actions,
 * then confirms the draft in Redux. Shared by OppoMoves' own "tap the same
 * move again" submit and by the Preview's tap-to-submit gesture (group 6) so
 * the Preview's freeze actually persists the entry instead of just flashing.
 */
export const useSubmitEntryDraft = (gameId: string) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { setIndex, mode } = useAppSelector((state) => state.game);
  const {
    status: { entryIndex },
    entryDraft: draft,
  } = useAppSelector((state) => state.game[mode]);
  const { game, mutate } = useGame(gameId);

  // Await the optimistic mutate and only confirm the draft in Redux once the
  // server actually persisted it. If the request fails the mutate rejects and
  // rolls the SWR game back, we skip the confirm (draft stays put for a retry),
  // and the error surfaces as a toast instead of a crash.
  const create = async () => {
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
    await mutate(createRally({ gameId, setIndex, entryIndex }, entry, game!), {
      revalidate: false,
      optimisticData: updatedGame,
    });
    dispatch(gameActions.confirmEntryDraftRally(phase));
  };

  const update = async () => {
    // Editing reuses the identity setEditingEntryStatus loaded onto the
    // draft; the entry being replaced must keep the same id.
    const entry = { ...(draft as RallyView), id: draft.id, seq: draft.seq };
    const { game: updatedGame, phase } = updateRallyHelper(
      { gameId, setIndex, entryIndex },
      entry,
      game!,
    );
    await mutate(updateRally({ gameId, setIndex, entryIndex }, entry, game!), {
      revalidate: false,
      optimisticData: updatedGame,
    });
    dispatch(gameActions.confirmEntryDraftRally(phase));
    dispatch(gameActions.setGameMode("general"));
  };

  return async () => {
    try {
      if (mode === "general") {
        await create();
      } else {
        await update();
      }
    } catch (error) {
      showErrorToast(error, toast);
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
  // the Preview's send affordance (D12), so there is no second-tap-to-submit
  // here anymore.
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
