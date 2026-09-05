"use client";
import { Container, MoveButton } from "@/components/game/panel/moves";
import { useGame } from "@/hooks/use-data";
import type { PendingWritesApi } from "@/hooks/use-pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import {
  applyEntry,
  assertRallyAt,
  deriveEntryPhase,
} from "@/lib/features/game/helpers";
import type { RallyView } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { scoringMoves, type ScoringMove } from "@/lib/scoring-moves";
import { FiMinus, FiPlus } from "react-icons/fi";

/**
 * `enqueue`/`flush` come from the caller, not a hook call here -- `Game` is
 * the single mounted owner of `usePendingWrites`, so taking them as arguments
 * is what stops this hook becoming a second flushing instance.
 */
export const useSubmitEntryDraft = (
  gameId: string,
  { enqueue, flush }: Pick<PendingWritesApi, "enqueue" | "flush">,
) => {
  const dispatch = useAppDispatch();
  const { setIndex, mode } = useAppSelector((state) => state.game);
  const {
    status: { entryIndex },
    entryDraft: draft,
  } = useAppSelector((state) => state.game[mode]);
  const { game, mutate } = useGame(gameId);

  // Advances the draft the instant the entry is enqueued, without waiting for
  // the server: the queue's retry and the sync indicator are what make the
  // recorder safe to keep going.
  const create = () => {
    const entry = {
      ...(draft as RallyView),
      id: crypto.randomUUID(),
      seq: entryIndex,
    };
    const phase = deriveEntryPhase(game!, setIndex, entryIndex, entry);
    mutate((raw) => applyEntry(raw!, setIndex, entry, phase), {
      revalidate: false,
    });
    enqueue(entry);
    dispatch(gameActions.confirmEntryDraftRally(phase));
    void flush();
  };

  // Waits for its result, unlike create: the recorder is watching a dialog.
  const update = async () => {
    const entry = { ...(draft as RallyView), id: draft.id, seq: draft.seq };
    assertRallyAt(game!, setIndex, entryIndex);
    const phase = deriveEntryPhase(game!, setIndex, entryIndex, entry);
    mutate((raw) => applyEntry(raw!, setIndex, entry, phase), {
      revalidate: false,
    });
    enqueue(entry);
    const result = await flush();
    if (!result.ok) {
      // Not thrown, not rolled back, no toast: the editing card is what
      // shows a failed write now. See honest-sync-status.
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
