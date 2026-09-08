import type { Lineup } from "@/entities/team";
import type {
  LineupListPlayer,
  TMatchInfoForm,
} from "@/lib/features/game/types";

export const newGameFormDefaults = (
  homeTeamName: string | undefined,
): TMatchInfoForm => ({
  name: "",
  number: 1,
  phase: "0",
  division: "0",
  category: "0",
  teams: { home: { name: homeTeamName }, away: { name: "" } },
  scoring: { setCount: "3", decidingSetPoints: 15 },
  location: { city: "", hall: "" },
  time: { date: new Date(), start: "", end: "" },
});

export const newGameBody = ({
  info,
  teamId,
  players,
  lineup,
}: {
  info: TMatchInfoForm;
  teamId: string;
  players: LineupListPlayer[];
  lineup?: Lineup;
}) => {
  const { teams: _teams, ...matchInfo } = {
    ...info,
    phase: Number(info.phase),
    division: Number(info.division),
    category: Number(info.category),
    scoring: { ...info.scoring, setCount: Number(info.scoring.setCount) },
  };

  return {
    info: matchInfo,
    teams: {
      home: {
        id: teamId,
        name: info.teams.home.name,
        players: players.map(({ list: _list, ...player }) => player),
        lineup,
      },
      away: { name: info.teams.away.name },
    },
  };
};
