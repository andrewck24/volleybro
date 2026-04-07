"use client";
import { Entry } from "@/components/game/entry";
import { Card } from "@/components/ui/card";
import { EntryType } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import type { EntryView, ReduxGameState } from "@/lib/features/game/types";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";

export const GamePreview = ({
  gameId,
  mode,
  handleOptionOpen,
  className,
}: {
  gameId: string;
  mode: ReduxGameState["mode"];
  handleOptionOpen?: (value: string) => void;
  className?: string;
}) => {
  const { game } = useGame(gameId);
  const { players } = game!.teams.home;
  const { setIndex } = useAppSelector((state) => state.game);
  const {
    entryDraft: draft,
    status: { inProgress, entryIndex },
  } = useAppSelector((state) => state.game[mode]);

  if (!inProgress) return null;

  const lastEntry = game!.sets[setIndex].entries[entryIndex - 1];
  const isEditing = draft.home.player?.id || draft.home.type;
  const draftRallyEntry =
    draft.win !== null &&
    draft.home.type !== null &&
    draft.home.num !== null &&
    draft.away.type !== null &&
    draft.away.num !== null
      ? {
          type: EntryType.RALLY as const,
          win: draft.win,
          home: {
            score: draft.home.score,
            type: draft.home.type,
            num: draft.home.num,
            ...(draft.home.player ? { player: draft.home.player } : {}),
          },
          away: {
            score: draft.away.score,
            type: draft.away.type,
            num: draft.away.num,
            ...(draft.away.player ? { player: draft.away.player } : {}),
          },
        }
      : null;
  const draftEntry: EntryView = draft.substitution
    ? { type: EntryType.SUBSTITUTION, ...draft.substitution }
    : draft.timeout
      ? { type: EntryType.TIMEOUT, ...draft.timeout }
      : draft.challenge
        ? { type: EntryType.CHALLENGE, ...draft.challenge }
        : (draftRallyEntry ?? lastEntry);
  const entry = isEditing || entryIndex === 0 ? draftEntry : lastEntry;

  return (
    <Card className={cn("grid w-full p-2", className)}>
      <Entry
        entry={entry}
        players={players}
        onClick={
          handleOptionOpen ? () => handleOptionOpen("summary") : undefined
        }
        className={isEditing ? "animate-pulse duration-1000" : ""}
      />
    </Card>
  );
};
