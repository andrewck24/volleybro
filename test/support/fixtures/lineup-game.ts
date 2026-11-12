import { MoveType, upsertEntries } from "@/entities/game";
import { Position } from "@/entities/player";
import type { LineupPlayer } from "@/entities/team";
import { createGame } from "./entities";
import { createRecordedRally } from "./entries";

type Slot = Partial<LineupPlayer>;

const roster = [
  ...["p1", "p2", "p3", "p4", "p5", "p6"].map((id, i) => ({
    id,
    name: id,
    number: i + 1,
  })),
  { id: "l1", name: "l1", number: 10 },
  { id: "s1", name: "s1", number: 11 },
  { id: "s2", name: "s2", number: 12 },
];

const defaultPositions = [
  Position.MB,
  Position.OH,
  Position.OP,
  Position.S,
  Position.MB,
  Position.OH,
];

export const homeRally = (win: boolean, seq: number) =>
  createRecordedRally({
    id: `e${seq}`,
    seq,
    win,
    home: { score: 1, type: MoveType.ATTACK, num: 1 },
    away: { score: 0, type: MoveType.RECEPTION, num: 1 },
  });

export const createLineupGame = ({
  starting = {},
  liberos = [{ id: "l1", position: Position.L }],
  entries = [],
  liberoReplacePosition = Position.NONE,
  serve = "home",
  numberless = [],
}: {
  starting?: Record<number, Slot>;
  liberos?: Slot[];
  entries?: ReturnType<typeof homeRally>[];
  liberoReplacePosition?:
    Position.NONE | Position.OH | Position.MB | Position.OP;
  serve?: "home" | "away";
  numberless?: string[];
} = {}) => {
  const base = createGame();
  const [firstSet] = base.sets;
  const lineups = {
    home: {
      options: { liberoReplaceMode: 0 as const, liberoReplacePosition },
      starting: defaultPositions.map((position, i) => ({
        id: `p${i + 1}`,
        position,
        ...starting[i],
      })) as never,
      liberos: liberos as never,
      substitutes: [{ id: "s1" }, { id: "s2" }] as never,
    },
  };
  return createGame({
    teams: {
      ...base.teams,
      home: {
        ...base.teams.home,
        players: roster.map((player) =>
          numberless.includes(player.id)
            ? { ...player, number: undefined }
            : player,
        ) as never,
      },
    },
    sets: [
      {
        ...firstSet!,
        options: { serve },
        startingLineups: lineups,
        lineups: (
          upsertEntries(
            { startingLineups: lineups, entries } as never,
            [],
          ) as never as {
            set: { lineups: never };
          }
        ).set.lineups,
        entries,
      },
    ],
  });
};
