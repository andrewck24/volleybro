"use client";
import { Container, MoveButton } from "@/components/game/panel/moves";
import { useToast } from "@/components/ui/use-toast";
import { useGame } from "@/hooks/use-data";
import { ERROR_MESSAGES } from "@/lib/api/error-messages";
import { EntryType, type EntryIdentity } from "@/entities/game";
import { gameActions } from "@/lib/features/game/game-slice";
import { applyEntry, deriveEntryPhase } from "@/lib/features/game/helpers";
import { useEntryRecording } from "@/lib/features/game/hooks/use-entry-recording";
import type { GameView, RallyView } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { scoringMoves, type ScoringMove } from "@/lib/scoring-moves";
import { FiMinus, FiPlus } from "react-icons/fi";

export const useSubmitEntryDraft = (gameId: string) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { setIndex, mode } = useAppSelector((state) => state.game);
  const {
    status: { entryIndex },
    entryDraft: draft,
  } = useAppSelector((state) => state.game[mode]);
  const { game } = useGame(gameId);
  const { record, edit } = useEntryRecording(gameId);

  const content = () => ({
    ...(draft as RallyView),
    type: EntryType.RALLY as const,
  });
  const phaseOf = (entry: RallyView & EntryIdentity) =>
    deriveEntryPhase(game!, setIndex, entryIndex, entry);
  const apply = (target: GameView, entry: RallyView & EntryIdentity) => ({
    game: applyEntry(target, setIndex, entry, phaseOf(entry)),
  });

  const create = () => {
    const result = record(content(), apply);
    if (result.status !== "recorded") return;
    dispatch(gameActions.confirmEntryDraftRally(phaseOf(result.entry)));
  };

  const update = async () => {
    if (game!.sets[setIndex]?.entries[entryIndex]?.type !== EntryType.RALLY) {
      toast({ ...ERROR_MESSAGES.ENTRY_TYPE_CHANGED, variant: "error" });
      return;
    }
    const result = await edit(content(), apply);
    if (result.status !== "edited") return;
    dispatch(gameActions.confirmEntryDraftRally(phaseOf(result.entry)));
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

  const onOppoClick = (move: ScoringMove) => {
    dispatch(gameActions.setEntryDraftAwayMove(move));
  };

  return (
    <Container data-move-grid="away" className="grid-cols-1">
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
