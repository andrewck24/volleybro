import type { Game } from "@/entities/game";
import { Position } from "@/entities/player";
import { useLineup } from "@/lib/features/game/hooks/use-lineup";
import type { ReduxStatus } from "@/lib/features/game/types";
import {
  createLineupGame,
  homeRally,
} from "@test/support/fixtures/lineup-game";
import { renderGameHook } from "@test/support/react/render-game";
import { waitFor } from "@testing-library/react";

type Court = ReturnType<typeof useLineup>;

const numbers = (players: Court["starting"]) => players.map((p) => p.number);

const renderLineup = (
  game: Game,
  {
    editingEntryIndex,
    status: override,
    setIndex = 0,
  }: {
    editingEntryIndex?: number;
    status?: Partial<ReduxStatus>;
    setIndex?: number;
  } = {},
) =>
  renderGameHook(
    game,
    (store) => {
      const { general, editing } = store.getState().game;
      const status =
        editingEntryIndex === undefined ? general.status : editing.status;
      return useLineup(game.id, setIndex, { ...status, ...override });
    },
    { editingEntryIndex },
  );

const loaded = (result: { current: Court }) =>
  waitFor(() => expect(result.current.starting).toHaveLength(6));

describe("useLineup", () => {
  describe("when there is no lineup to show", () => {
    it("is empty until the game has loaded", () => {
      const { result } = renderLineup(createLineupGame());

      expect(result.current).toEqual({ starting: [], liberos: [] });
    });

    it("is empty once the set is over", async () => {
      const { result, gameLoaded } = renderLineup(createLineupGame(), {
        status: { isSetInProgress: false },
      });

      await gameLoaded();

      expect(result.current).toEqual({ starting: [], liberos: [] });
    });

    it("is empty for a set the game does not have", async () => {
      const { result, gameLoaded } = renderLineup(createLineupGame(), {
        setIndex: 5,
      });

      await gameLoaded();

      expect(result.current).toEqual({ starting: [], liberos: [] });
    });
  });

  describe("while recording (general mode)", () => {
    it("lists the starters in zone order with the libero on the bench", async () => {
      const { result } = renderLineup(createLineupGame());
      await loaded(result);

      expect(numbers(result.current.starting)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(numbers(result.current.liberos)).toEqual([10]);
    });

    it("shows the substitute beside the starter they replaced", async () => {
      const game = createLineupGame({
        starting: { 1: { sub: { id: "s1", entryIndex: { in: 0 } } } },
      });
      const { result } = renderLineup(game);
      await loaded(result);

      expect(result.current.starting[1]).toMatchObject({
        number: 2,
        sub: { id: "s1", number: 11, entryIndex: { in: 0 } },
      });
    });

    it("shows a substitute beside the libero", async () => {
      const game = createLineupGame({
        liberos: [
          {
            id: "l1",
            position: Position.L,
            sub: { id: "s2", entryIndex: { in: 0 } },
          },
        ],
      });
      const { result } = renderLineup(game);
      await loaded(result);

      expect(result.current.liberos[0]).toMatchObject({
        number: 10,
        sub: { id: "s2", number: 12 },
      });
    });

    it("rotates the starters once for each serve the home side wins back", async () => {
      const game = createLineupGame({
        entries: [homeRally(false, 0), homeRally(true, 1)],
      });
      const { result } = renderLineup(game);
      await loaded(result);

      expect(numbers(result.current.starting)).toEqual([2, 3, 4, 5, 6, 1]);
    });

    it("does not rotate when the home side only loses the serve", async () => {
      const game = createLineupGame({ entries: [homeRally(false, 0)] });
      const { result } = renderLineup(game);
      await loaded(result);

      expect(numbers(result.current.starting)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    describe("with a libero replacing the middle blocker", () => {
      const withLibero = (entries: ReturnType<typeof homeRally>[]) =>
        createLineupGame({ liberoReplacePosition: Position.MB, entries });

      it("swaps the libero in for the back-row middle blocker while serving", async () => {
        const { result } = renderLineup(withLibero([]));
        await loaded(result);

        expect(numbers(result.current.starting)).toEqual([1, 2, 3, 4, 10, 6]);
        expect(numbers(result.current.liberos)).toEqual([5]);
      });

      it("swaps the libero in for the zone 1 middle blocker while receiving", async () => {
        const { result } = renderLineup(withLibero([homeRally(false, 0)]));
        await loaded(result);

        expect(numbers(result.current.starting)).toEqual([10, 2, 3, 4, 5, 6]);
        expect(numbers(result.current.liberos)).toEqual([1]);
      });

      it("keeps the middle blocker at the net while receiving", async () => {
        const { result } = renderLineup(
          createLineupGame({
            liberoReplacePosition: Position.MB,
            starting: {
              0: { position: Position.OH },
              4: { position: Position.OH },
            },
            entries: [homeRally(false, 0)],
          }),
        );
        await loaded(result);

        expect(numbers(result.current.starting)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(numbers(result.current.liberos)).toEqual([10]);
      });

      it("swaps nobody when the team has no libero", async () => {
        const { result } = renderLineup(
          createLineupGame({ liberoReplacePosition: Position.MB, liberos: [] }),
        );
        await loaded(result);

        expect(numbers(result.current.starting)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(result.current.liberos).toEqual([]);
      });
    });
  });

  describe("while editing an earlier entry", () => {
    const rallies = [0, 1, 2, 3].map((seq) => homeRally(true, seq));

    it("rotates for the serve the home side won before that entry", async () => {
      const game = createLineupGame({
        serve: "away",
        entries: [0, 1, 2].map((seq) => homeRally(true, seq)),
      });
      const { result } = renderLineup(game, { editingEntryIndex: 2 });
      await loaded(result);

      expect(numbers(result.current.starting)).toEqual([2, 3, 4, 5, 6, 1]);
    });

    it("shows the starter at a point before their replacement came on", async () => {
      const game = createLineupGame({
        entries: rallies,
        starting: {
          1: { id: "s1", sub: { id: "p2", entryIndex: { in: 2 } } },
        },
      });
      const { result } = renderLineup(game, { editingEntryIndex: 1 });
      await loaded(result);

      expect(result.current.starting[1]).toMatchObject({
        number: 2,
        sub: { id: null },
      });
    });

    it("shows the replacement on court and the starter beside them", async () => {
      const game = createLineupGame({
        entries: rallies,
        starting: {
          1: { id: "s1", sub: { id: "p2", entryIndex: { in: 2 } } },
        },
      });
      const { result } = renderLineup(game, { editingEntryIndex: 3 });
      await loaded(result);

      expect(result.current.starting[1]).toMatchObject({
        number: 11,
        sub: { id: "p2", number: 2 },
      });
    });

    const swappedBack = createLineupGame({
      entries: [0, 1, 2, 3, 4, 5].map((seq) => homeRally(true, seq)),
      starting: {
        1: { id: "p2", sub: { id: "s1", entryIndex: { in: 2, out: 4 } } },
      },
    });

    it("shows the replacement on court while they were on", async () => {
      const { result } = renderLineup(swappedBack, { editingEntryIndex: 3 });
      await loaded(result);

      expect(result.current.starting[1]).toMatchObject({
        number: 11,
        sub: { id: "p2", number: 2 },
      });
    });

    it("shows the starter back on court after they swapped back in", async () => {
      const { result } = renderLineup(swappedBack, { editingEntryIndex: 5 });
      await loaded(result);

      expect(result.current.starting[1]).toMatchObject({
        number: 2,
        sub: { id: "s1", number: 11 },
      });
    });
  });
});
