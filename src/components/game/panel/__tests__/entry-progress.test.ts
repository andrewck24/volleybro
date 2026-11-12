import { MoveType } from "@/entities/game";
import { getEntryProgress } from "@/components/game/panel/entry-progress";
import type { ReduxEntryDraft } from "@/lib/features/game/types";

const baseDraft: ReduxEntryDraft = {
  id: "",
  seq: 0,
  win: null,
  home: { score: 0, type: null, num: null, player: { id: "", zone: 0 } },
  away: { score: 0, type: null, num: null, player: { id: "", zone: 0 } },
};

describe("getEntryProgress", () => {
  it("keeps the active step on player when the player step has no selection", () => {
    const progress = getEntryProgress(baseDraft);

    expect(progress.activeStep).toBe(0);
    expect(progress.reachableSteps).toEqual([0]);
    expect(progress.steps).toHaveLength(3);
  });

  it("advances to the home step once a player is selected", () => {
    const draft: ReduxEntryDraft = {
      ...baseDraft,
      home: { ...baseDraft.home, player: { id: "p1", zone: 1 } },
    };

    const progress = getEntryProgress(draft);

    expect(progress.activeStep).toBe(1);
    expect(progress.reachableSteps).toEqual([0, 1]);
  });

  it("treats num === 0 as a complete home move (guards falsy-but-valid num)", () => {
    const draft: ReduxEntryDraft = {
      ...baseDraft,
      home: {
        ...baseDraft.home,
        player: { id: "p1", zone: 1 },
        type: MoveType.SERVING,
        num: 0,
      },
    };

    const progress = getEntryProgress(draft);

    expect(progress.activeStep).toBe(2);
    expect(progress.reachableSteps).toEqual([0, 1, 2]);
  });

  it("collapses to a two-step submittable flow when OUR move is an unforced (opponent) error", () => {
    const draft: ReduxEntryDraft = {
      ...baseDraft,
      home: { ...baseDraft.home, type: MoveType.UNFORCED, num: 10 },
      away: { ...baseDraft.away, type: MoveType.BLOCKING, num: 3 },
    };

    const progress = getEntryProgress(draft);

    expect(progress.steps).toHaveLength(2);
    expect(progress.activeStep).toBe(1);
    expect(progress.reachableSteps).toEqual([0, 1]);
    expect(progress.submittable).toBe(true);
  });

  it("keeps a losing home serve on the full three-step flow", () => {
    const draft: ReduxEntryDraft = {
      ...baseDraft,
      home: {
        ...baseDraft.home,
        player: { id: "p1", zone: 1 },
        type: MoveType.SERVING,
        num: 1,
      },
      away: { ...baseDraft.away, type: MoveType.UNFORCED, num: 9 },
    };

    const progress = getEntryProgress(draft);

    expect(progress.steps).toHaveLength(3);
    expect(progress.activeStep).toBe(2);
    expect(progress.submittable).toBe(true);
  });

  it("does not infer player selection from away-move completeness", () => {
    const draft: ReduxEntryDraft = {
      ...baseDraft,
      away: { ...baseDraft.away, type: MoveType.BLOCKING, num: 3 },
    };

    const progress = getEntryProgress(draft);

    expect(progress.activeStep).toBe(0);
    expect(progress.reachableSteps).toEqual([0]);
    expect(progress.submittable).toBe(false);
  });

  it("does not collapse a normal three-step point", () => {
    const draft: ReduxEntryDraft = {
      ...baseDraft,
      home: {
        ...baseDraft.home,
        player: { id: "p1", zone: 1 },
        type: MoveType.BLOCKING,
        num: 3,
      },
      away: { ...baseDraft.away, type: MoveType.ATTACK, num: 4 },
    };

    const progress = getEntryProgress(draft);

    expect(progress.steps).toHaveLength(3);
    expect(progress.activeStep).toBe(2);
    expect(progress.submittable).toBe(true);
  });
});
