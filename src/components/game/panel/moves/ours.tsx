"use client";
import {
  Container,
  MOVE_CELL_CLASS,
  MoveButton,
} from "@/components/game/panel/moves";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { EntryType } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import { ERROR_MESSAGES } from "@/lib/api/error-messages";
import { gameActions } from "@/lib/features/game/game-slice";
import type { GameDraftMode } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import {
  backMoves,
  errorMoves,
  frontMoves,
  type ScoringMove,
} from "@/lib/scoring-moves";
import { FiMinus, FiPlus } from "react-icons/fi";
import { RiRepeat2Line } from "react-icons/ri";

const ERROR_CELL_CLASS = "justify-between gap-1 px-3 py-0.5 leading-tight";

export const OursMoves = ({ mode }: { mode: GameDraftMode }) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const id = useAppSelector((state) => state.game.id);
  const setIndex = useAppSelector((state) => state.game.setIndex);
  const { game } = useGame(id);
  const { entryDraft: draft, status } = useAppSelector(
    (state) => state.game[mode],
  );
  const editedEntry =
    mode === "editing"
      ? game?.sets[setIndex]?.entries[status.entryIndex]
      : undefined;
  const lockedWin =
    editedEntry?.type === EntryType.RALLY ? editedEntry.win : undefined;
  const zone = draft.home.player?.zone ?? 0;
  const oursMoves =
    zone === 0 ? errorMoves : zone === 1 || zone >= 5 ? backMoves : frontMoves;

  const onOursClick = (move: ScoringMove) => {
    if (lockedWin !== undefined && move.win !== lockedWin) {
      toast({ ...ERROR_MESSAGES.ENTRY_WINNER_CHANGED, variant: "error" });
      return;
    }
    dispatch(gameActions.setEntryDraftHomeMove({ mode, move }));
  };

  return (
    <Container
      data-move-grid="home"
      className={zone === 0 ? "auto-rows-[minmax(44px,1fr)]" : undefined}
    >
      {oursMoves.map((move) => {
        const Icon = move.win ? FiPlus : FiMinus;
        return (
          <MoveButton
            key={`${move.type}-${move.num}`}
            move={move}
            toggled={draft.home.num === move.num}
            onClick={() => onOursClick(move)}
            className={cn(
              zone === 0 && ERROR_CELL_CLASS,
              lockedWin !== undefined && move.win !== lockedWin && "opacity-50",
            )}
            {...(zone === 0 && { "aria-label": `對方${move.text}失誤` })}
          >
            {zone === 0 ? (
              <>
                <span className="flex flex-col items-start text-left">
                  <span>對方</span>
                  <span>{move.text}失誤</span>
                </span>
                <Icon className="size-6" />
              </>
            ) : (
              <>
                {move.text}
                <Icon />
              </>
            )}
          </MoveButton>
        );
      })}
      {!!zone && (
        <Button
          variant="secondary"
          size="lg"
          className={MOVE_CELL_CLASS}
          onClick={() =>
            dispatch(gameActions.setPanel({ mode, panel: "substitutes" }))
          }
        >
          替補
          <RiRepeat2Line />
        </Button>
      )}
    </Container>
  );
};
