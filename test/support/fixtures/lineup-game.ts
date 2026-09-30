import { EntryType, MoveType } from "@/entities/game";
import { Position } from "@/entities/player";
import type { LineupPlayer } from "@/entities/team";
import { createGame } from "./entities";

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

/** A rally the home side won (`true`) or lost, with scores that keep the set in progress. */
export const homeRally = (win: boolean, seq: number) => ({
  id: `e${seq}`,
  seq,
  type: EntryType.RALLY as const,
  win,
  home: { score: 1, type: MoveType.ATTACK, num: 1 },
  away: { score: 0, type: MoveType.RECEPTION, num: 1 },
});

/**
 * A one-set game whose home roster is p1-p6 (numbers 1-6), libero l1 (10) and
 * substitutes s1 (11) and s2 (12). `starting` overrides the stored slot at a
 * given index; the default slots are p1..p6 at MB, OH, OP, S, MB, OH.
 */
export const createLineupGame = ({
  starting = {},
  liberos = [{ id: "l1", position: Position.L }],
  entries = [],
  liberoReplacePosition = Position.NONE,
  serve = "home",
}: {
  starting?: Record<number, Slot>;
  liberos?: Slot[];
  entries?: ReturnType<typeof homeRally>[];
  liberoReplacePosition?:
    Position.NONE | Position.OH | Position.MB | Position.OP;
  serve?: "home" | "away";
} = {}) => {
  const base = createGame();
  const [firstSet] = base.sets;
  return createGame({
    teams: { ...base.teams, home: { ...base.teams.home, players: roster } },
    sets: [
      {
        ...firstSet!,
        options: { serve },
        lineups: {
          home: {
            options: { liberoReplaceMode: 0, liberoReplacePosition },
            starting: defaultPositions.map((position, i) => ({
              id: `p${i + 1}`,
              position,
              ...starting[i],
            })) as never,
            liberos: liberos as never,
            substitutes: [{ id: "s1" }, { id: "s2" }] as never,
          },
        },
        entries,
      },
    ],
  });
};
