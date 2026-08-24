"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useGame } from "@/hooks/use-data";
import { showErrorToast } from "@/lib/api/error-toast";
import { createSubstitution } from "@/lib/features/game/actions/create-substitution";
import { gameActions } from "@/lib/features/game/game-slice";
import { createSubstitutionHelper } from "@/lib/features/game/helpers";
import { useSubstitutes } from "@/lib/features/game/hooks/use-substitutes";
import type { ReduxGameState } from "@/lib/features/game/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { RiArrowLeftWideLine, RiCheckLine } from "react-icons/ri";

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

  const onSubmit = async () => {
    try {
      // A new substitution gets a fresh identity generated here, before the
      // optimistic update below applies it; editing reuses the id
      // setEditingEntryStatus already loaded onto the draft.
      const entry = {
        ...draft.substitution!,
        id: draft.id || crypto.randomUUID(),
        seq: entryIndex,
      };
      mutate(
        createSubstitution({ gameId, setIndex, entryIndex }, entry, game!),
        {
          revalidate: false,
          optimisticData: createSubstitutionHelper(
            { gameId, setIndex, entryIndex },
            entry,
            game!,
          ),
        },
      );
      dispatch(gameActions.confirmEntryDraftSubstitution());
    } catch (error) {
      showErrorToast(error, toast);
    }
  };

  return (
    <Card className={cn("w-full flex-1 pb-4", className)}>
      <CardHeader>
        <CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(gameActions.resetEntryDraftSubstitution())}
          >
            <RiArrowLeftWideLine />
          </Button>
          選擇替補球員
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {substitutes.map((substitute) => {
          const toggled = draft?.substitution?.players?.in === substitute.id;
          return (
            <Button
              key={substitute.id}
              variant={toggled ? "default" : "outline"}
              size="wide"
              className="text-xl"
              onClick={() =>
                toggled
                  ? dispatch(gameActions.resetEntryDraftSubstitution())
                  : dispatch(
                      gameActions.setEntryDraftSubstitution(substitute.id),
                    )
              }
            >
              <span className="flex basis-8 justify-end font-semibold">
                {substitute.number}
              </span>
              {substitute.name}
            </Button>
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
