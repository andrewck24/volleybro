import {
  EntryType,
  Side,
  type EntryContent,
  type SetLineups,
} from "@/entities/game";
import { Position, type Lineup } from "@/entities/team";

/** Six starters a-f, libero l, bench x and y. */
export const lineup = (): Lineup => ({
  options: { liberoReplaceMode: 0, liberoReplacePosition: Position.NONE },
  starting: ["a", "b", "c", "d", "e", "f"].map((id) => ({
    id,
    position: Position.OH,
  })),
  liberos: [{ id: "l", position: Position.L }],
  substitutes: [{ id: "x" }, { id: "y" }],
});

/** A home substitution entry with id `sub-<seq>`. */
export const sub = (seq: number, out: string, into: string): EntryContent => ({
  type: EntryType.SUBSTITUTION,
  id: `sub-${seq}`,
  seq,
  team: Side.HOME,
  players: { in: into, out },
});

export const onCourt = (l: SetLineups) => l.home.starting.map((p) => p.id);
