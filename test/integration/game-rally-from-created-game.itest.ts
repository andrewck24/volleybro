import { MoveType } from "@/entities/game";
import type { GameRepositoryImpl } from "@/infrastructure/db/repositories/game.repository.mongo";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { POST as createGame } from "@/app/api/games/route";
import { POST as createSet } from "@/app/api/games/[gameId]/sets/route";
import { PUT as createRally } from "@/app/api/games/[gameId]/sets/rallies/route";
import { NextRequest } from "next/server";
import { useFakeAuth } from "./support/auth";
import { callRoute } from "./support/request";
import { lineupFor, oid } from "./support/seed";

const options = { serve: "home", time: { start: "10:00", end: "" } };

/** The exact body `NewGameForm.createGame` sends. */
const newGameBody = (teamId: string, playerIds: string[]) => ({
  info: {
    name: "Test Match",
    number: 1,
    phase: 0,
    division: 0,
    category: 0,
    teams: { home: { name: "Home" }, away: { name: "Away" } },
    scoring: { setCount: 3, decidingSetPoints: 15 },
    location: { city: "", hall: "" },
    time: { date: new Date().toISOString(), start: "", end: "" },
    weather: { temperature: "" },
  },
  teams: {
    home: {
      id: teamId,
      name: "Home",
      // NewGameForm sends {id, name, number, list} — no `stats` key.
      players: playerIds.map((id, i) => ({
        id,
        name: `Player ${i + 1}`,
        number: i + 1,
        list: i < 6 ? "starting" : "substitutes",
      })),
      lineup: lineupFor(playerIds),
    },
    away: { name: "Away" },
  },
});

describe("real recording flow: create game -> create set 0 -> first rally", () => {
  beforeEach(() => useFakeAuth());

  const repo = () => container.get<GameRepositoryImpl>(TYPES.GameRepository);

  it("records the first rally of a game created through POST /api/games", async () => {
    const teamId = oid();
    const playerIds = Array.from({ length: 8 }, oid);

    const res = await createGame(
      new NextRequest(`http://localhost/api/games?ti=${teamId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGameBody(teamId, playerIds)),
      }),
    );
    expect(res.status).toBe(201);
    const { id: gameId } = (await res.json()) as { id: string };

    // The set-options panel submits the lineup it read back off the game.
    const persisted = await repo().findById(gameId);
    const setRes = await callRoute(createSet, {
      gameId,
      method: "POST",
      query: { si: 0 },
      body: { lineup: persisted!.teams.home.lineup, options },
    });
    expect(setRes.status).toBe(201);

    // The entry draft Redux actually submits: the home side carries the tapped
    // player, the away side keeps the initial-state placeholder `id: ""`.
    const draft = {
      id: "entry-1",
      seq: 0,
      win: true,
      home: {
        score: 1,
        type: MoveType.ATTACK,
        num: 0,
        player: { id: playerIds[0], zone: 4 },
      },
      away: {
        score: 0,
        type: MoveType.ATTACK,
        num: 1,
        player: { id: "", zone: 0 },
      },
    };

    const rallyRes = await callRoute(createRally, {
      gameId,
      method: "PUT",
      query: { si: 0 },
      body: [draft],
    });
    expect(rallyRes.status).toBe(200);
  });
});
