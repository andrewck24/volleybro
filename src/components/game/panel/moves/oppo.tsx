"use client";
import { Container, MoveButton } from "@/components/game/panel/moves";
import { useToast } from "@/components/ui/use-toast";
import type { Rally } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import { showErrorToast } from "@/lib/api/error-toast";
import { createRally } from "@/lib/features/game/actions/create-rally";
import { updateRally } from "@/lib/features/game/actions/update-rally";
import { gameActions } from "@/lib/features/game/game-slice";
import {
  createRallyHelper,
  updateRallyHelper,
} from "@/lib/features/game/helpers";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { scoringMoves, type ScoringMove } from "@/lib/scoring-moves";
import { FiMinus, FiPlus } from "react-icons/fi";
import { RiSendPlaneLine } from "react-icons/ri";

export const OppoMoves = ({ gameId }: { gameId: string }) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { setIndex, mode } = useAppSelector((state) => state.game);
  const {
    status: { entryIndex },
    entryDraft: draft,
  } = useAppSelector((state) => state.game[mode]);
  const { game, mutate } = useGame(gameId);

  const oppoMoves = scoringMoves.filter((option) =>
    scoringMoves[draft.home.num ?? -1]?.outcome.includes(option.num),
  );

  const create = () => {
    const { game: updatedGame, phase } = createRallyHelper(
      { gameId, setIndex, entryIndex },
      draft as Rally,
      game!,
    );
    mutate(
      createRally({ gameId, setIndex, entryIndex }, draft as Rally, game!),
      {
        revalidate: false,
        optimisticData: updatedGame,
      },
    );
    dispatch(gameActions.confirmEntryDraftRally(phase));
  };

  const update = () => {
    const { game: updatedGame, phase } = updateRallyHelper(
      { gameId, setIndex, entryIndex },
      draft as Rally,
      game!,
    );
    mutate(
      updateRally({ gameId, setIndex, entryIndex }, draft as Rally, game!),
      {
        revalidate: false,
        optimisticData: updatedGame,
      },
    );
    dispatch(gameActions.confirmEntryDraftRally(phase));
    dispatch(gameActions.setGameMode("general"));
  };

  const onOppoClick = async (move: ScoringMove) => {
    if (draft.away.num !== move.num) {
      dispatch(gameActions.setEntryDraftAwayMove(move));
    } else {
      try {
        if (mode === "general") {
          create();
        } else {
          update();
        }
      } catch (error) {
        showErrorToast(error, toast);
      }
    }
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
          {draft.away.num === move.num && <RiSendPlaneLine />}
        </MoveButton>
      ))}
    </Container>
  );
};
