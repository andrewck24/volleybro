import {
  Side,
  upsertEntries,
  type EntryContent,
  type SetLineups,
} from "@/entities/game";
import { lineup, onCourt, sub } from "@test/support/fixtures/lineup-writes";

const starting: SetLineups = { home: lineup() };

const write = (...entries: EntryContent[]) =>
  upsertEntries(
    { startingLineups: starting, entries: [] as EntryContent[] },
    entries,
  );

const lineupsOf = (...entries: EntryContent[]) => {
  const result = write(...entries);
  if ("invalid" in result) throw new Error("expected a set");
  return result.set.lineups;
};

describe("Current lineup recomputation through upsertEntries", () => {
  it("marks both players of a substitution with its seq", () => {
    const lineups = lineupsOf(sub(1, "a", "x"));

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
    const lineups = lineupsOf(sub(0, "a", "x"), sub(3, "x", "a"));

    expect(lineups.home.starting[0]).toMatchObject({
      id: "a",
      sub: { id: "x", entryIndex: { in: 0, out: 3 } },
    });
  });

  it("recomputes from the starting lineup after a past substitution changes", () => {
    const before = lineupsOf(sub(0, "a", "x"), sub(1, "x", "a"));
    const edited = lineupsOf(sub(0, "a", "y"), sub(1, "y", "a"));

    expect(onCourt(before)).toEqual(onCourt(edited));
    expect(edited.home.substitutes[1]).toMatchObject({
      id: "y",
      sub: { id: "a", entryIndex: { in: 0, out: 1 } },
    });
  });

  it("names the first substitution in seq order that cannot apply", () => {
    const result = write(sub(2, "a", "x"), sub(1, "x", "y"), sub(3, "q", "y"));

    expect(result).toMatchObject({ invalid: { id: "sub-1" } });
  });

  it("refuses a substitution whose incoming player is already on court", () => {
    expect(write(sub(0, "a", "b"))).toMatchObject({ invalid: { id: "sub-0" } });
  });

  it("refuses a substitution on a side that has no lineup", () => {
    const away = { ...sub(0, "a", "x"), team: Side.AWAY };

    expect(write(away)).toMatchObject({ invalid: { id: "sub-0" } });
  });

  it("leaves liberos and the starting lineups themselves untouched", () => {
    const lineups = lineupsOf(sub(0, "a", "x"));

    expect(lineups.home.liberos).toEqual(starting.home.liberos);
    expect(onCourt(starting)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
});
