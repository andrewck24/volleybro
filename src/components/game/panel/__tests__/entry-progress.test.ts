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
    // No player is picked for an opponent error; the home move itself is
    // UNFORCED (num 9-14) and the single outcome auto-fills the away move.
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

  it("keeps our own losing serve on the full three-step flow (away auto-fills UNFORCED, must not collapse)", () => {
    // num 1 = 發球失分: home.type SERVING, but its outcome[0]=9 auto-fills an
    // UNFORCED away move. Keying the discriminator on away.type would wrongly
    // collapse this; keying on home.type keeps it a normal three-step point.
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
