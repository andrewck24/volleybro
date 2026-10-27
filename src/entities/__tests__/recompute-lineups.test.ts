import {
  EntryType,
  Side,
  recomputeLineups,
  type LineupEntry,
  type SetLineups,
} from "@/entities/game";
import { Position, type Lineup } from "@/entities/team";

const lineup = (): Lineup => ({
  options: { liberoReplaceMode: 0, liberoReplacePosition: Position.NONE },
  starting: ["a", "b", "c", "d", "e", "f"].map((id) => ({
    id,
    position: Position.OH,
  })),
  liberos: [{ id: "l", position: Position.L }],
  substitutes: [{ id: "x" }, { id: "y" }],
});

const starting: SetLineups = { home: lineup() };

const sub = (
  seq: number,
  out: string,
  into: string,
): LineupEntry & { id: string } => ({
  id: `sub-${seq}`,
  type: EntryType.SUBSTITUTION,
  seq,
  team: Side.HOME,
  players: { in: into, out },
});

const rally = (seq: number): LineupEntry & { id: string } => ({
  id: `rally-${seq}`,
  type: EntryType.RALLY,
  seq,
});

const onCourt = (l: SetLineups) => l.home.starting.map((p) => p.id);

describe("recomputeLineups", () => {
  it("applies a substitution and marks both players with its seq", () => {
    const { lineups, invalid } = recomputeLineups(starting, [
      rally(0),
      sub(1, "a", "x"),
    ]);

    expect(invalid).toBeUndefined();
    expect(lineups.home.starting[0]).toMatchObject({
      id: "x",
      sub: { id: "a", entryIndex: { in: 1 } },
    });
    expect(lineups.home.substitutes[0]).toMatchObject({
      id: "a",
      sub: { id: "x", entryIndex: { in: 1 } },
    });
  });

  it("records the swap back as out, and keeps seq 0 distinguishable", () => {
    const { lineups } = recomputeLineups(starting, [
      sub(0, "a", "x"),
      sub(3, "x", "a"),
    ]);

    expect(lineups.home.starting[0]).toMatchObject({
      id: "a",
      sub: { id: "x", entryIndex: { in: 0, out: 3 } },
    });
  });

  it("gives the same lineups whatever order the entries arrive in", () => {
    const entries = [sub(2, "b", "y"), rally(1), sub(0, "a", "x")];

    expect(recomputeLineups(starting, entries).lineups).toEqual(
      recomputeLineups(starting, [...entries].reverse()).lineups,
    );
  });

  it("recomputes from the starting lineup after a past substitution changes", () => {
    const before = recomputeLineups(starting, [
      sub(0, "a", "x"),
      sub(1, "x", "a"),
    ]);
    const edited = recomputeLineups(starting, [
      sub(0, "a", "y"),
      sub(1, "y", "a"),
    ]);

    expect(onCourt(before.lineups)).toEqual(onCourt(edited.lineups));
    expect(edited.lineups.home.substitutes[1]).toMatchObject({
      id: "y",
      sub: { id: "a", entryIndex: { in: 0, out: 1 } },
    });
  });

  it("reports the first substitution whose outgoing player is off court", () => {
    const first = sub(1, "x", "y");
    const { invalid, lineups } = recomputeLineups(starting, [
      sub(2, "a", "x"),
      first,
      sub(3, "q", "y"),
    ]);

    expect(invalid).toBe(first);
    expect(onCourt(lineups)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("reports a substitution whose incoming player is already on court", () => {
    const bad = sub(0, "a", "b");

    expect(recomputeLineups(starting, [bad]).invalid).toBe(bad);
  });

  it("reports a substitution on a side that has no lineup", () => {
    const away = { ...sub(0, "a", "x"), team: Side.AWAY };

    expect(recomputeLineups(starting, [away]).invalid).toBe(away);
  });

  it("returns the lineups in effect just before each entry", () => {
    const { atSeq } = recomputeLineups(starting, [sub(1, "a", "x"), rally(2)]);

    expect(onCourt(atSeq.get(1)!)).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(onCourt(atSeq.get(2)!)).toEqual(["x", "b", "c", "d", "e", "f"]);
  });

  it("leaves liberos and the starting lineups themselves untouched", () => {
    const { lineups } = recomputeLineups(starting, [sub(0, "a", "x")]);

    expect(lineups.home.liberos).toEqual(starting.home.liberos);
    expect(onCourt(starting)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
});
