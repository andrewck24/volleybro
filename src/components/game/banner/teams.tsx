"use client";
import { Figure } from "@/components/custom/stats/figures";
import { deriveSetsWon } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import type {
  GameTeamView,
  MatchView,
  SetView,
} from "@/lib/features/game/types";
import { RiGroupLine } from "react-icons/ri";

export const Teams = ({ gameId }: { gameId: string }) => {
  const { game } = useGame(gameId);

  return (
    <div className="flex w-full flex-row items-center justify-center gap-2 py-2">
      <TeamAvatar team={game!.teams.home} isHome={true} />
      <SetScore sets={game!.sets} scoring={game!.info.scoring} />
      <TeamAvatar team={game!.teams.away} isHome={false} />
    </div>
  );
};

const TeamAvatar = ({
  team,
  isHome,
}: {
  team?: GameTeamView;
  isHome: boolean;
}) => {
  return (
    <div className="flex w-20 flex-col items-center justify-center gap-2">
      <RiGroupLine className="size-15" />
      <p className="h-12 w-full text-center">
        {team?.name || (isHome ? "我方" : "對手")}
      </p>
    </div>
  );
};

const SetScore = ({
  sets,
  scoring,
}: {
  sets: SetView[];
  scoring: MatchView["scoring"];
}) => {
  const { home: homeSetsWon, away: awaySetsWon } = deriveSetsWon(sets, scoring);
  const isHomeWin = homeSetsWon > awaySetsWon;
  const isAwayWin = awaySetsWon > homeSetsWon;

  return (
    <div className="flex flex-1 flex-row items-center justify-center gap-2">
      <Figure
        value={homeSetsWon}
        size="lg"
        variant={isHomeWin ? "primaryText" : "secondary"}
      />
      <div className="font-medium text-muted-foreground">:</div>
      <Figure
        value={awaySetsWon}
        size="lg"
        variant={isAwayWin ? "destructiveText" : "secondary"}
      />
    </div>
  );
};
