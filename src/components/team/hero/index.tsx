"use client";
import { useTeam } from "@/hooks/use-data";

const TeamHero = ({ teamId }: { teamId: string }) => {
  const { team, isLoading, isValidating } = useTeam(teamId);

  return (
    <div className="flex h-[7.5rem] w-full shrink-0 flex-col justify-end bg-primary p-2">
      {!team || isLoading || isValidating ? (
        <p className="h-8 w-[16rem] animate-pulse rounded-md bg-muted" />
      ) : (
        <h1 className="text-2xl text-primary-foreground">
          {team?.name || "Loading..."}
        </h1>
      )}
    </div>
  );
};

export default TeamHero;
