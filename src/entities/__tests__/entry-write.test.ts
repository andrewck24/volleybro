import { CommonReason, ValidationError } from "@/entities/errors";
import {
  EntryType,
  MoveType,
  Side,
  planEntryUpserts,
  upsertEntries,
  type Entry,
  type EntryContent,
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

const startingLineups: SetLineups = { home: lineup() };

const onCourt = (l: SetLineups) => l.home.starting.map((p) => p.id);

const detail = (score: number) => ({ score, type: MoveType.ATTACK, num: 1 });

const rally = (seq: number, home: number, away: number): EntryContent => ({
  type: EntryType.RALLY,
  id: `rally-${seq}`,
  seq,
  win: true,
  home: detail(home),
  away: detail(away),
});

const sub = (seq: number, out: string, into: string): EntryContent => ({
  type: EntryType.SUBSTITUTION,
  id: `sub-${seq}`,
  seq,
  team: Side.HOME,
  players: { in: into, out },
});

const at = new Date("2026-01-01T10:00:00Z");
const later = new Date("2026-01-01T10:05:00Z");
const record = { recordedBy: "p1", recordedAt: at };
const stored = (entry: EntryContent): Entry => ({ ...entry, ...record });

const emptySet = { startingLineups, entries: [] as Entry[] };
const setOf = (...entries: EntryContent[]) => ({
  startingLineups,
  entries: entries.map(stored),
});

describe("upsertEntries", () => {
  it("overwrites by id and orders by seq", () => {
    const result = upsertEntries(
      { startingLineups, entries: [rally(2, 1, 1), rally(1, 0, 1)] },
      [{ ...rally(2, 1, 1), seq: 3 }, rally(4, 2, 1)],
    );
    if ("invalid" in result) throw new Error("expected a set");
    expect(result.set.entries.map((e) => [e.id, e.seq])).toEqual([
      ["rally-1", 1],
      ["rally-2", 3],
      ["rally-4", 4],
    ]);
  });

  it("recomputes the Current lineup from every substitution", () => {
    const result = upsertEntries(
      { startingLineups, entries: [] as EntryContent[] },
      [sub(2, "b", "y"), sub(1, "a", "x")],
    );
    if ("invalid" in result) throw new Error("expected a set");
    expect(onCourt(result.set.lineups)).toEqual(["x", "y", "c", "d", "e", "f"]);
  });

  it("returns the refused substitution with the score before it", () => {
    const result = upsertEntries(
      { startingLineups, entries: [rally(1, 3, 2)] },
      [sub(2, "z", "x")],
    );
    expect(result).toMatchObject({
      invalid: { id: "sub-2", score: { home: 3, away: 2 } },
    });
  });

  it("scores a refused substitution before any rally as 0:0", () => {
    const result = upsertEntries(
      { startingLineups, entries: [] as EntryContent[] },
      [sub(1, "z", "x")],
    );
    expect(result).toMatchObject({
      invalid: { id: "sub-1", score: { home: 0, away: 0 } },
    });
  });

  it("refuses a write that breaks a later recorded substitution", () => {
    const result = upsertEntries(
      { startingLineups, entries: [sub(2, "a", "x")] },
      [sub(1, "a", "y")],
    );
    expect(result).toMatchObject({
      invalid: { id: "sub-2", score: { home: 0, away: 0 } },
    });
  });

  it("returns the merged entries and the lineups the set already had when refusing", () => {
    const current = {
      home: { ...lineup(), starting: lineup().starting.slice().reverse() },
    };
    const result = upsertEntries(
      { startingLineups, lineups: current, entries: [rally(3, 1, 0)] },
      [sub(2, "z", "x"), rally(1, 0, 1)],
    );
    if (!("invalid" in result)) throw new Error("expected a refusal");
    expect(result.set.entries.map((e) => e.id)).toEqual([
      "rally-1",
      "sub-2",
      "rally-3",
    ]);
    expect(result.set.lineups).toBe(current);
  });
});

describe("planEntryUpserts", () => {
  it("creates an unknown id, stamping the recorder", () => {
    const result = planEntryUpserts(
      emptySet,
      [{ entry: rally(1, 1, 0), at }],
      "p1",
    );
    if ("invalid" in result) throw new Error("expected a set");
    const created = { ...rally(1, 1, 0), recordedBy: "p1", recordedAt: at };
    expect(result.steps).toEqual([{ id: "rally-1", created }]);
    expect(result.set.entries).toEqual([created]);
  });

  it("takes a resend of the same recorder and instant as no step", () => {
    const set = setOf(rally(1, 1, 0));
    const result = planEntryUpserts(set, [{ entry: rally(1, 1, 0), at }], "p1");
    if ("invalid" in result) throw new Error("expected a set");
    expect(result.steps).toEqual([]);
    expect(result.set.entries).toEqual(set.entries);
  });

  it("keeps the recorder and stamps the last editor on an edit", () => {
    const set = setOf(rally(1, 1, 0));
    const result = planEntryUpserts(
      set,
      [{ entry: rally(1, 2, 0), at: later }],
      "p2",
    );
    if ("invalid" in result) throw new Error("expected a set");
    const edited = {
      ...rally(1, 2, 0),
      ...record,
      editedBy: "p2",
      editedAt: later,
    };
    expect(result.steps).toEqual([{ id: "rally-1", edited }]);
    expect(result.set.entries).toEqual([edited]);
  });

  it("classifies a later write of an id against the earlier one in the batch", () => {
    const result = planEntryUpserts(
      emptySet,
      [
        { entry: rally(1, 1, 0), at },
        { entry: rally(1, 2, 0), at: later },
      ],
      "p1",
    );
    if ("invalid" in result) throw new Error("expected a set");
    expect(result.steps.map((s) => Object.keys(s))).toEqual([
      ["id", "created"],
      ["id", "edited"],
    ]);
  });

  it("orders the resulting set by seq", () => {
    const result = planEntryUpserts(
      setOf(rally(2, 1, 1)),
      [{ entry: rally(1, 0, 1), at }],
      "p1",
    );
    if ("invalid" in result) throw new Error("expected a set");
    expect(result.set.entries.map((e) => e.seq)).toEqual([1, 2]);
  });

  it("refuses a substitution that does not fit the lineup", () => {
    const result = planEntryUpserts(
      setOf(rally(1, 3, 2)),
      [{ entry: sub(2, "z", "x"), at }],
      "p1",
    );
    expect(result).toMatchObject({
      invalid: { id: "sub-2", score: { home: 3, away: 2 } },
    });
  });

  it("refuses a starting lineup that invalidates a recorded substitution", () => {
    const changed: SetLineups = {
      home: {
        ...lineup(),
        starting: lineup().starting.filter((p) => p.id !== "a"),
      },
    };
    const result = planEntryUpserts(
      { startingLineups: changed, entries: [stored(sub(1, "a", "x"))] },
      [{ entry: rally(2, 1, 0), at }],
      "p1",
    );
    expect(result).toMatchObject({
      invalid: { id: "sub-1", score: { home: 0, away: 0 } },
    });
  });

  it.each([
    ["id", { ...rally(1, 1, 0), id: undefined }],
    ["seq", { ...rally(1, 1, 0), seq: undefined }],
  ])("rejects a write lacking its %s", (_, entry) => {
    const run = () =>
      planEntryUpserts(
        emptySet,
        [{ entry: entry as unknown as EntryContent, at }],
        "p1",
      );
    expect(run).toThrow(ValidationError);
    try {
      run();
    } catch (error) {
      expect((error as ValidationError).reason).toBe(
        CommonReason.INVALID_INPUT,
      );
    }
  });
});
