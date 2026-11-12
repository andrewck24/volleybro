import {
  composeEntryActions,
  isLatestEntry,
} from "@/components/game/entry/last-entry-rule";

describe("isLatestEntry", () => {
  it("is true for the last index of a non-empty list", () => {
    expect(isLatestEntry(2, 3)).toBe(true);
  });

  it("is false for any earlier index", () => {
    expect(isLatestEntry(0, 3)).toBe(false);
    expect(isLatestEntry(1, 3)).toBe(false);
  });

  it("guards an empty list instead of throwing", () => {
    expect(isLatestEntry(0, 0)).toBe(false);
    expect(isLatestEntry(-1, 0)).toBe(false);
  });

  it("guards an out-of-bounds index", () => {
    expect(isLatestEntry(5, 3)).toBe(false);
    expect(isLatestEntry(-1, 3)).toBe(false);
  });
});

describe("composeEntryActions", () => {
  it("maps the last-entry policy to available actions", () => {
    expect(composeEntryActions(true)).toEqual(["edit", "delete"]);
  });

  it("composes edit + rollbackToHere for a non-latest entry, with no delete", () => {
    const actions = composeEntryActions(false);
    expect(actions).toEqual(["edit", "rollbackToHere"]);
    expect(actions).not.toContain("delete");
  });
});
