import type { Game } from "@/entities/game";
import { useSubstitutes } from "@/lib/features/game/hooks/use-substitutes";
import {
  createLineupGame,
  homeRally,
} from "@test/support/fixtures/lineup-game";
import { renderGameHook } from "@test/support/react/render-game";
import { waitFor } from "@testing-library/react";

const renderSubstitutes = (
  game: Game,
  selectedPlayerId: string,
  editingEntryIndex?: number,
) =>
  renderGameHook(
    game,
    (store) => {
      const { game: state } = store.getState();
      const mode = editingEntryIndex === undefined ? "general" : "editing";
      return useSubstitutes(game.id, {
        setIndex: state.setIndex,
        entryIndex: state[mode].status.entryIndex,
        entryDraft: state[mode].entryDraft,
      });
    },
    { editingEntryIndex, selectedPlayerId },
  );

const numbers = (players: { number?: number }[]) =>
  players.map((p) => p.number).sort((a, b) => (a ?? 0) - (b ?? 0));

const settled = async (result: { current: unknown[] }, expected: number[]) =>
  waitFor(() =>
    expect(numbers(result.current as { number?: number }[])).toEqual(
      [...expected].sort((a, b) => a - b),
    ),
  );

type LineupSlots = NonNullable<
  Parameters<typeof createLineupGame>[0]
>["starting"];

const rallies = (count: number) =>
  Array.from({ length: count }, (_, seq) => homeRally(true, seq));

describe("useSubstitutes", () => {
  it("offers nobody until the game has loaded", () => {
    const { result } = renderSubstitutes(createLineupGame(), "p1");

    expect(result.current).toEqual([]);
  });

  describe("while recording (general mode)", () => {
    it("offers every bench player to a starter who has not been replaced", async () => {
      const { result } = renderSubstitutes(
        createLineupGame({ entries: rallies(2) }),
        "p1",
      );

      await settled(result, [11, 12]);
    });

    it("does not offer a bench player who already replaced another starter", async () => {
      const game = createLineupGame({
        entries: rallies(2),
        starting: {
          2: { id: "p3", sub: { id: "s2", entryIndex: { in: 1, out: 2 } } },
        },
      });
      const { result } = renderSubstitutes(game, "p1");

      await settled(result, [11]);
    });

    it("lets a replacement swap back only with the starter they replaced", async () => {
      const game = createLineupGame({
        entries: rallies(2),
        starting: { 1: { id: "s1", sub: { id: "p2", entryIndex: { in: 1 } } } },
      });
      const { result } = renderSubstitutes(game, "s1");

      await settled(result, [2]);
    });

    it("lets a replacement who entered at the set's first entry swap back only with the starter", async () => {
      const game = createLineupGame({
        entries: rallies(2),
        starting: { 1: { id: "s1", sub: { id: "p2", entryIndex: { in: 0 } } } },
      });
      const { result } = renderSubstitutes(game, "s1");

      await settled(result, [2]);
    });

    it("offers nobody once the position has used both substitutions", async () => {
      const game = createLineupGame({
        entries: rallies(2),
        starting: {
          1: { id: "p2", sub: { id: "s1", entryIndex: { in: 1, out: 2 } } },
        },
      });
      const { result, gameLoaded } = renderSubstitutes(game, "p2");

      await gameLoaded();
      expect(result.current).toEqual([]);
    });

    it("offers every bench player when no starter is selected", async () => {
      const { result } = renderSubstitutes(
        createLineupGame({ entries: rallies(2) }),
        "nobody",
      );

      await settled(result, [11, 12]);
    });
  });

  describe("while editing an earlier entry", () => {
    const edit = (
      starting: LineupSlots,
      selectedPlayerId: string,
      entryIndex: number,
    ) =>
      renderSubstitutes(
        createLineupGame({ entries: rallies(6), starting }),
        selectedPlayerId,
        entryIndex,
      );

    it("offers every bench player before any substitution", async () => {
      const { result } = edit({}, "p1", 2);

      await settled(result, [11, 12]);
    });

    it("offers nobody for a player who is not in the lineup", async () => {
      const { result, gameLoaded } = edit({}, "nobody", 2);

      await gameLoaded();
      expect(result.current).toEqual([]);
    });

    it("finds the position through the replacement who was on court", async () => {
      const { result } = edit(
        { 1: { id: "p2", sub: { id: "s1", entryIndex: { in: 1, out: 3 } } } },
        "s1",
        2,
      );

      await settled(result, [2]);
    });

    it("lets the starter come back on, alongside the bench, before the replacement arrived", async () => {
      const { result } = edit(
        { 1: { id: "s1", sub: { id: "p2", entryIndex: { in: 4 } } } },
        "p2",
        2,
      );

      await settled(result, [11, 12]);
    });

    it("lets the starter come back on when editing the first entry, where the replacement arrived", async () => {
      const { result } = edit(
        { 1: { id: "s1", sub: { id: "p2", entryIndex: { in: 0 } } } },
        "p2",
        0,
      );

      await settled(result, [11, 12]);
    });

    it("lets a replacement swap back only with the starter they replaced", async () => {
      const { result } = edit(
        { 1: { id: "s1", sub: { id: "p2", entryIndex: { in: 1 } } } },
        "s1",
        3,
      );

      await settled(result, [2]);
    });

    it("lets a replacement who is already off swap only with the starter", async () => {
      const { result } = edit(
        { 1: { id: "p2", sub: { id: "s1", entryIndex: { in: 1, out: 4 } } } },
        "p2",
        2,
      );

      await settled(result, [2]);
    });

    it("offers nobody once the position had used both substitutions by then", async () => {
      const { result, gameLoaded } = edit(
        { 1: { id: "p2", sub: { id: "s1", entryIndex: { in: 1, out: 2 } } } },
        "p2",
        4,
      );

      await gameLoaded();
      expect(result.current).toEqual([]);
    });
  });
});
