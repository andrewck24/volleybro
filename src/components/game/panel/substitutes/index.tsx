"use client";
import { PickerRow } from "@/components/custom/picker-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { EntryType } from "@/entities/game";
import { ERROR_MESSAGES } from "@/lib/api/error-messages";
import { gameActions } from "@/lib/features/game/game-slice";
import { applySubstitution } from "@/lib/features/game/helpers";
import { useEntryRecording } from "@/lib/features/game/hooks/use-entry-recording";
import { useSubstitutes } from "@/lib/features/game/hooks/use-substitutes";
import type {
  GameView,
  PendingSubstitution,
  GameDraftMode,
} from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { RiArrowLeftSLine, RiCheckLine } from "react-icons/ri";

export const Substitutes = ({
  gameId,
  mode,
  className,
}: {
  gameId: string;
  mode: GameDraftMode;
  className?: string;
}) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { record, edit } = useEntryRecording(gameId);
  const setIndex = useAppSelector((state) => state.game.setIndex);
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
    const content = { type: EntryType.SUBSTITUTION as const, team, players };
    const apply = (target: GameView, entry: PendingSubstitution) =>
      applySubstitution(target, setIndex, entry);
    const result = isEditing
      ? await edit(content, apply)
      : record(content, apply);
    if (result.status === "invalid") {
      const { substitutionId, scoreBefore } = result.invalid;
      toast(
        substitutionId === result.entry.id
          ? { ...ERROR_MESSAGES.INVALID_SUBSTITUTION, variant: "error" }
          : {
              ...ERROR_MESSAGES.LATER_SUBSTITUTION_INVALID,
              title: ERROR_MESSAGES.LATER_SUBSTITUTION_INVALID.title
                .replace("{home}", String(scoreBefore.home))
                .replace("{away}", String(scoreBefore.away)),
              variant: "error",
            },
      );
      return;
    }
    if (result.status === "recorded")
      dispatch(gameActions.confirmEntryDraftSubstitution());
  };

  return (
    <Card className={cn("w-full flex-1 pb-4", className)}>
      <CardHeader>
        <CardTitle>
          <Button
            variant="glass"
            size="icon"
            onClick={() =>
              dispatch(gameActions.resetEntryDraftSubstitution(mode))
            }
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
                  ? dispatch(gameActions.resetEntryDraftSubstitution(mode))
                  : dispatch(
                      gameActions.setEntryDraftSubstitution({
                        mode,
                        playerId: substitute.id,
                      }),
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
