// The GameView the real recording components read,
// built from the shared demo fixture. Loaded only with the walkthrough.
import {
  AWAY_PLAYERS,
  AWAY_TEAM,
  DEMO_GAME_ID,
  HOME_PLAYERS,
  HOME_TEAM,
  SEED_COUNT,
  SET_RALLIES,
  foldRallies,
} from "@/components/landing/demo-data";
import { EntryType } from "@/entities/game";
import { Position } from "@/entities/team";
import type { GameView } from "@/lib/features/game/types";
import { scoringMoves } from "@/lib/scoring-moves";

const side = (name: string, id: string) => ({ id, name, staffs: [] });

const entries: GameView["sets"][number]["entries"] = foldRallies(
  SET_RALLIES.slice(0, SEED_COUNT),
).map((r, seq) => ({
  type: EntryType.RALLY,
  id: `seed-${seq}`,
  seq,
  win: r.win,
  home: {
    score: r.homeScore,
    type: scoringMoves[r.home]!.type,
    num: r.home,
    player: { id: r.player, zone: 4 },
  },
  away: {
    score: r.awayScore,
    type: scoringMoves[r.away]!.type,
    num: r.away,
  },
}));

const lineupPlayer = (id: string, position: Position) => ({ id, position });

export const demoGame: GameView = {
  id: DEMO_GAME_ID,
  win: null,
  teamId: HOME_TEAM.id,
  info: { name: "示範賽", scoring: { setCount: 3, decidingSetPoints: 15 } },
  teams: {
    home: { ...side(HOME_TEAM.name, HOME_TEAM.id), players: HOME_PLAYERS },
    away: { ...side(AWAY_TEAM.name, AWAY_TEAM.id), players: AWAY_PLAYERS },
  },
  sets: [
    {
      win: null,
      options: { serve: "home" },
      lineups: {
        home: {
          options: {
            liberoReplaceMode: 0,
            liberoReplacePosition: Position.NONE,
          },
          starting: HOME_PLAYERS.slice(0, 6).map((p) =>
            lineupPlayer(p.id, p.position as Position),
          ),
          liberos: [lineupPlayer("p7", Position.L)],
          substitutes: [],
        },
      },
      entries,
    },
  ],
};
