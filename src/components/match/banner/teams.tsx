import type { Record, Set, Team } from "@/entities/record";
import { RiGroupLine } from "react-icons/ri";

export const Teams = ({ record }: { record: Record }) => {
  return (
    <div className="flex w-full flex-row items-center justify-center gap-2 py-2">
      <TeamAvatar team={record.teams.home} isHome={true} />
      <SetScore sets={record.sets} />
      <TeamAvatar team={record.teams.away} isHome={false} />
    </div>
  );
};

const TeamAvatar = ({ team, isHome }: { team?: Team; isHome: boolean }) => {
  return (
    <div className="flex w-20 flex-col items-center justify-center gap-2">
      <RiGroupLine className="size-15" />
      <p className="h-12 w-full text-center">
        {team.name || (isHome ? "我方" : "對手")}
      </p>
    </div>
  );
};

const SetScore = ({ sets }: { sets: Set[] }) => {
  const homeSetsWon = sets.filter((set) => set.win === true).length;
  const awaySetsWon = sets.filter((set) => set.win === false).length;

  return (
    <div className="flex flex-1 flex-row items-center justify-center gap-2">
      <div className="flex size-16 items-center justify-center rounded-lg bg-accent text-[3rem]">
        {homeSetsWon}
      </div>
      <div className="font-medium text-muted-foreground">:</div>
      <div className="flex size-16 items-center justify-center rounded-lg bg-accent text-[3rem]">
        {awaySetsWon}
      </div>
    </div>
  );
};
