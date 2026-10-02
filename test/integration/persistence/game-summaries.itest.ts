import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { EntryType, MoveType, type Game } from "@/entities/game";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { oid } from "../support/seed";

const games = () => container.get<IGameRepository>(TYPES.GameRepository);

const rally = (seq: number, home: number, away: number) => ({
  type: EntryType.RALLY,
  id: `rally-${seq}`,
  seq,
  win: home > away,
  home: { score: home, type: MoveType.ATTACK, num: 1, player: { id: null } },
  away: { score: away, type: MoveType.ATTACK, num: 1, player: { id: null } },
});

const finishedSet = (win: boolean, home: number, away: number) => ({
  win,
  entries: [rally(0, 1, 0), rally(1, home, away)],
});

const createGame = (teamId: string, name: string, sets: unknown[] = []) =>
  games().create({
    win: false,
    teamId,
    info: { name, scoring: { setCount: 3, decidingSetPoints: 15 } },
    teams: {
      home: { id: oid(), name: `${name} home`, players: [], staffs: [] },
      away: { id: oid(), name: `${name} away`, players: [], staffs: [] },
    },
    sets,
  } as unknown as Omit<Game, "id">);

describe("game summaries", () => {
  const teamId = oid();
  const names = (data: { info: { name?: string } }[]) =>
    data.map((summary) => summary.info.name);

  it("reads each set's final score and counts the sets each side won", async () => {
    await createGame(teamId, "Match", [
      finishedSet(true, 25, 20),
      finishedSet(false, 18, 25),
      finishedSet(true, 25, 23),
    ]);

    const { data } = await games().findGameSummaries(teamId);

    expect(data).toHaveLength(1);
    expect(data[0]!.teams.home).toMatchObject({
      name: "Match home",
      sets: 2,
      scores: [25, 18, 25],
    });
    expect(data[0]!.teams.away).toMatchObject({
      sets: 1,
      scores: [20, 25, 23],
    });
  });

  it("lists the team's games newest first, one page at a time", async () => {
    await createGame(teamId, "First");
    await createGame(teamId, "Second");
    await createGame(teamId, "Third");
    await createGame(oid(), "Someone else's");

    const firstPage = await games().findGameSummaries(teamId, { limit: 2 });
    expect(names(firstPage.data)).toEqual(["Third", "Second"]);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.lastId).toBe(firstPage.data[1]!.id);

    const lastPage = await games().findGameSummaries(teamId, {
      limit: 2,
      lastId: firstPage.lastId,
    });
    expect(names(lastPage.data)).toEqual(["First"]);
    expect(lastPage.hasMore).toBe(false);

    const beyond = await games().findGameSummaries(teamId, {
      limit: 2,
      lastId: lastPage.lastId,
    });
    expect(beyond.data).toEqual([]);
    expect(beyond.lastId).toBe(lastPage.lastId);
  });

  it("reports no further page when the page holds exactly the games left", async () => {
    await createGame(teamId, "First");
    await createGame(teamId, "Second");

    const page = await games().findGameSummaries(teamId, { limit: 2 });

    expect(page.data).toHaveLength(2);
    expect(page.hasMore).toBe(false);
  });
});
