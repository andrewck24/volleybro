import type { Lineup } from "@/entities/team";
import type {
  GameFormValues,
  LineupListPlayer,
} from "@/lib/features/game/types";

export const newGameFormDefaults = (
  homeTeamName: string | undefined,
): GameFormValues => ({
  name: "",
  number: 1,
  phase: "0",
  division: "0",
  category: "0",
  teams: { home: { name: homeTeamName ?? "" }, away: { name: "" } },
  scoring: { setCount: "3", decidingSetPoints: 15 },
  location: { city: "", hall: "" },
  time: { date: new Date(), start: "", end: "" },
});

type NewGameInfo = Omit<
  GameFormValues,
  "teams" | "phase" | "division" | "category" | "scoring"
> & {
  phase: number;
  division: number;
  category: number;
  scoring: Omit<GameFormValues["scoring"], "setCount"> & {
    setCount: number;
  };
};

export type NewGameBody = {
  info: NewGameInfo;
  teams: {
    home: {
      id: string;
      name: string;
      players: Omit<LineupListPlayer, "list">[];
      lineup?: Lineup;
    };
    away: { name: string };
  };
};

export const newGameBody = ({
  info,
  teamId,
  players,
  lineup,
}: {
  info: GameFormValues;
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
  } satisfies NewGameBody;
};
