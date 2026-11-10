"use client";
import {
  Container,
  MOVE_CELL_CLASS,
  MoveButton,
} from "@/components/game/panel/moves";
import { Button } from "@/components/ui/button";
import { gameActions } from "@/lib/features/game/game-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  backMoves,
  errorMoves,
  frontMoves,
  type ScoringMove,
} from "@/lib/scoring-moves";
import { FiMinus, FiPlus } from "react-icons/fi";
import { RiRepeat2Line } from "react-icons/ri";

// px-3 replaces `lg`'s px-8, which clipped the icon in a half-width cell. See ADR-0122.
const ERROR_CELL_CLASS = "justify-between gap-1 px-3 py-0.5 leading-tight";

export const OursMoves = () => {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector((state) => state.game);
  const { entryDraft: draft } = gameState[gameState.mode];
  const zone = draft.home.player?.zone ?? 0;
  const oursMoves =
    zone === 0 ? errorMoves : zone === 1 || zone >= 5 ? backMoves : frontMoves;

  const onOursClick = (move: ScoringMove) => {
    dispatch(gameActions.setEntryDraftHomeMove(move));
  };

  return (
    <Container
      data-move-grid="home"
      className={
        // See ADR-0122.
        zone === 0 ? "auto-rows-[minmax(44px,1fr)]" : undefined
      }
    >
      {oursMoves.map((move) => {
        const Icon = move.win ? FiPlus : FiMinus;
        return (
          <MoveButton
            key={`${move.type}-${move.num}`}
            move={move}
            toggled={draft.home.num === move.num}
            onClick={() => onOursClick(move)}
            {...(zone === 0 && {
              "aria-label": `對方${move.text}失誤`,
              className: ERROR_CELL_CLASS,
            })}
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
          onClick={() => dispatch(gameActions.setPanel("substitutes"))}
        >
          替補
          <RiRepeat2Line />
        </Button>
      )}
    </Container>
  );
};
