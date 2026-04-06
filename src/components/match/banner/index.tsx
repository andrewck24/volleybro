"use client";
import { Scores } from "@/components/match/banner/scores";
import { Teams } from "@/components/match/banner/teams";
import { Button, Link } from "@/components/ui/button";
import { Match, MatchPhase } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import { phase as phaseText } from "@/lib/constants/match";
import { RiFileListLine, RiInformationLine } from "react-icons/ri";

export const Banner = ({ gameId }: { gameId: string }) => {
  const { game } = useGame(gameId);

  return (
    <div className="flex w-full flex-col items-center justify-center bg-card px-4 py-2">
      <Info info={game!.info} />
      <Teams gameId={gameId} />
      <Scores sets={game!.sets} />
      <div className="grid w-full grid-cols-2 gap-2 py-2">
        <Button onClick={() => {}} variant="outline" size="lg">
          <RiInformationLine />
          賽事資訊
        </Button>
        <Link href={`/match/${gameId}/sets`} size="lg">
          <RiFileListLine />
          賽事記錄
        </Link>
      </div>
    </div>
  );
};

const Info = ({ info }: { info: Match }) => {
  const { name, phase, number, location } = info;

  return (
    <div className="flex w-full flex-col items-center justify-center px-4 pt-2 text-muted-foreground">
      <p>
        {name || "未知賽事"}
        {phase != null &&
          phase !== MatchPhase.NONE &&
          ` - ${getPhaseText(phase)}`}
        {number && ` - #${number}`}
      </p>
      <p>
        {location?.hall || "未知場地"}
        {location?.city && `, ${location.city}`}
      </p>
    </div>
  );
};

const getPhaseText = (phase: MatchPhase): string => {
  switch (phase) {
    case MatchPhase.ELIM:
      return phaseText.elim;
    case MatchPhase.SEED:
      return phaseText.seed;
    case MatchPhase.QUAL:
      return phaseText.qual;
    case MatchPhase.FINAL:
      return phaseText.final;
    default:
      return "";
  }
};
