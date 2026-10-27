"use client";
import { PickerRow } from "@/components/custom/picker-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { EntryType } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import { usePendingWritesContext } from "@/hooks/use-pending-writes";
import { ERROR_MESSAGES } from "@/lib/api/error-messages";
import { gameActions } from "@/lib/features/game/game-slice";
import { applySubstitution } from "@/lib/features/game/helpers";
import { useSubstitutes } from "@/lib/features/game/hooks/use-substitutes";
import type { ReduxGameState } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { RiArrowLeftSLine, RiCheckLine } from "react-icons/ri";

export const Substitutes = ({
  gameId,
  mode,
  className,
}: {
  gameId: string;
  mode: ReduxGameState["mode"];
  className?: string;
}) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { game, mutate } = useGame(gameId);
  const { enqueue, flush } = usePendingWritesContext();
  const { setIndex } = useAppSelector((state) => state.game);
  const { status, entryDraft: draft } = useAppSelector(
    (state) => state.game[mode],
  );
  const { entryIndex } = status;
  const substitutes = useSubstitutes(gameId, {
    setIndex,
    entryIndex,
    entryDraft: draft,
  });

  const isEditing = mode === "editing";

  const onSubmit = async () => {
    const { team, players } = draft.substitution!;
    const entry = {
      type: EntryType.SUBSTITUTION as const,
      team,
      players,
      id: isEditing ? draft.id : crypto.randomUUID(),
      seq: isEditing ? draft.seq : entryIndex,
      at: new Date().toISOString(),
    };
    // Checked against what the recorder sees, applied to what the cache holds:
    // the queue merges its own entries over the cache on every read.
    const checked = applySubstitution(game!, setIndex, entry);
    if ("invalid" in checked) {
      const { id, score } = checked.invalid;
      toast(
        id === entry.id
          ? { ...ERROR_MESSAGES.INVALID_SUBSTITUTION, variant: "error" }
          : {
              ...ERROR_MESSAGES.LATER_SUBSTITUTION_INVALID,
              title: ERROR_MESSAGES.LATER_SUBSTITUTION_INVALID.title
                .replace("{home}", String(score.home))
                .replace("{away}", String(score.away)),
              variant: "error",
            },
      );
      return;
    }
    mutate(
      (raw) => {
        const applied = applySubstitution(raw!, setIndex, entry);
        return "game" in applied ? applied.game : raw;
      },
      { revalidate: false },
    );
    enqueue(entry);
    if (!isEditing) {
      dispatch(gameActions.confirmEntryDraftSubstitution());
      void flush();
      return;
    }
    const result = await flush();
    if (!result.ok) return;
    dispatch(gameActions.confirmEntryDraftSubstitution());
    dispatch(gameActions.setGameMode("general"));
  };

  return (
    <Card className={cn("w-full flex-1 pb-4", className)}>
      <CardHeader>
        <CardTitle>
          <Button
            variant="glass"
            size="icon"
            onClick={() => dispatch(gameActions.resetEntryDraftSubstitution())}
          >
            <RiArrowLeftSLine />
          </Button>
          選擇替補球員
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {substitutes.map((substitute) => {
          const toggled = draft?.substitution?.players?.in === substitute.id;
          return (
            <PickerRow
              key={substitute.id}
              code={substitute.number}
              label={substitute.name}
              pressed={toggled}
              onClick={() =>
                toggled
                  ? dispatch(gameActions.resetEntryDraftSubstitution())
                  : dispatch(
                      gameActions.setEntryDraftSubstitution(substitute.id),
                    )
              }
            />
          );
        })}
      </CardContent>
      <Button size="lg" className="text-xl" onClick={onSubmit}>
        <RiCheckLine />
        確認
      </Button>
    </Card>
  );
};
