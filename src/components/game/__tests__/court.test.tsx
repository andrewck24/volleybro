import { GameCourt } from "@/components/game/court";
import { Position } from "@/entities/player";
import {
  createLineupGame,
  homeRally,
} from "@test/support/fixtures/lineup-game";
import { renderGame } from "@test/support/react/render-game";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("GameCourt", () => {
  it("shows each starter and the libero by shirt number", async () => {
    renderGame(
      <GameCourt gameId="game-1" mode="general" />,
      createLineupGame(),
    );

    for (const number of [1, 2, 3, 4, 5, 6, 10])
      expect(await screen.findByText(String(number))).toBeInTheDocument();
  });

  it("marks a starter's replacement with a badge showing their number", async () => {
    const game = createLineupGame({
      entries: [homeRally(true, 0), homeRally(true, 1)],
      starting: { 1: { sub: { id: "s1", entryIndex: { in: 1 } } } },
    });
    renderGame(<GameCourt gameId="game-1" mode="general" />, game);

    expect(await screen.findByText("替補")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
  });

  it("drops the badge once the replacement has gone off again", async () => {
    const game = createLineupGame({
      entries: [homeRally(true, 0), homeRally(true, 1)],
      starting: { 1: { sub: { id: "s1", entryIndex: { in: 1, out: 2 } } } },
    });
    const { gameLoaded } = renderGame(
      <GameCourt gameId="game-1" mode="general" />,
      game,
    );

    await gameLoaded();
    expect(await screen.findByText("6")).toBeInTheDocument();
    expect(screen.queryByText("替補")).not.toBeInTheDocument();
  });

  it("marks the libero's replacement with a badge showing their number", async () => {
    const game = createLineupGame({
      liberos: [
        {
          id: "l1",
          position: Position.L,
          sub: { id: "s2", entryIndex: { in: 1 } },
        },
      ],
    });
    renderGame(<GameCourt gameId="game-1" mode="general" />, game);

    expect(await screen.findByText("替補")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("shows 0 on the badge of a replacement who has no shirt number", async () => {
    const game = createLineupGame({
      entries: [homeRally(true, 0), homeRally(true, 1)],
      starting: { 1: { sub: { id: "s1", entryIndex: { in: 1 } } } },
      numberless: ["s1"],
    });
    renderGame(<GameCourt gameId="game-1" mode="general" />, game);

    expect(await screen.findByText("替補")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows 0 on the badge of a libero's replacement who has no shirt number", async () => {
    const game = createLineupGame({
      liberos: [
        {
          id: "l1",
          position: Position.L,
          sub: { id: "s2", entryIndex: { in: 1 } },
        },
      ],
      numberless: ["s2"],
    });
    renderGame(<GameCourt gameId="game-1" mode="general" />, game);

    expect(await screen.findByText("替補")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("selects the tapped starter as the entry's player", async () => {
    const { store } = renderGame(
      <GameCourt gameId="game-1" mode="general" />,
      createLineupGame(),
    );

    await userEvent.click(await screen.findByText("3"));

    expect(store.getState().game.general.entryDraft.home.player).toEqual({
      id: "p3",
      zone: 3,
    });
  });

  it("does not select the libero when tapped", async () => {
    const { store } = renderGame(
      <GameCourt gameId="game-1" mode="general" />,
      createLineupGame(),
    );

    await userEvent.click(await screen.findByText("10"));

    expect(store.getState().game.general.entryDraft.home.player?.id).toBe("");
  });

  it("selects into the editing draft while editing", async () => {
    const game = createLineupGame({
      entries: [homeRally(true, 0), homeRally(true, 1)],
    });
    const { store } = renderGame(
      <GameCourt gameId="game-1" mode="editing" />,
      game,
      { editingEntryIndex: 0 },
    );

    await userEvent.click(await screen.findByText("4"));

    expect(store.getState().game.editing.entryDraft.home.player).toEqual({
      id: "p4",
      zone: 4,
    });
  });
});
