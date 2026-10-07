import {
  AWAY_PLAYERS,
  AWAY_TEAM,
  DEMO_GAME_ID,
  HOME_PLAYERS,
  HOME_TEAM,
  SEED_COUNT,
} from "@/components/landing/demo-data";
import { entriesOf } from "@/components/landing/demo-entries";
import { Position } from "@/entities/team";
import type { GameView } from "@/lib/features/game/types";

const side = (name: string, id: string) => ({ id, name, staffs: [] });

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
          starting: HOME_PLAYERS.slice(0, 6).map((player) =>
            lineupPlayer(player.id, player.position as Position),
          ),
          liberos: [lineupPlayer("p7", Position.L)],
          substitutes: [],
        },
      },
      entries: entriesOf("seed", SEED_COUNT),
    },
  ],
};
