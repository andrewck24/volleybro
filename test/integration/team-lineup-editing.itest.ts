import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { PATCH as saveLineups } from "@/app/api/teams/[teamId]/lineups/route";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { NextRequest } from "next/server";
import { useFakeAuth } from "./support/auth";
import { lineupFor, oid } from "./support/seed";

// `withAuth` reads Better Auth directly rather than through the container, so
// the identity provider is the one thing this test cannot run for real.
jest.mock("@/lib/auth", () => ({
  auth: {
    api: { getSession: async () => ({ user: { id: "0".repeat(24) } }) },
  },
}));
jest.mock("next/headers", () => ({ headers: async () => new Headers() }));

const repo = () => container.get<ITeamRepository>(TYPES.TeamRepository);

const save = async (teamId: string, lineups: unknown) => {
  const req = new NextRequest(`http://localhost/api/teams/${teamId}/lineups`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lineups),
  });
  const res = await saveLineups(req, {
    params: Promise.resolve({ teamId }),
  });
  return { status: res.status, json: await res.json() };
};

describe("PATCH /api/teams/:id/lineups", () => {
  let teamId: string;
  let playerIds: string[];

  beforeEach(async () => {
    useFakeAuth();
    playerIds = Array.from({ length: 8 }, oid);
    const team = await repo().create({
      name: "Editing Team",
      lineups: [lineupFor(playerIds)],
    } as Parameters<ITeamRepository["create"]>[0]);
    teamId = team.id;
  });

  it("saves a lineup the editor loaded from the API and sent straight back", async () => {
    const loaded = (await repo().findById(teamId))!.lineups;

    const res = await save(teamId, JSON.parse(JSON.stringify(loaded)));

    expect(res.status).toBe(200);
  });

  it("saves a substitute added to that loaded lineup", async () => {
    const loaded = JSON.parse(
      JSON.stringify((await repo().findById(teamId))!.lineups),
    );
    loaded[0].substitutes.push({ id: playerIds[6] });

    const res = await save(teamId, loaded);

    expect(res.status).toBe(200);
    const saved = await repo().findById(teamId);
    expect(saved!.lineups[0]!.substitutes).toEqual([{ id: playerIds[6] }]);
  });

  it("rejects an undeclared field without touching the stored lineup", async () => {
    const before = (await repo().findById(teamId))!.lineups;

    const res = await save(teamId, [{ ...before[0], nickname: "starters" }]);

    expect(res.status).toBe(400);
    const after = await repo().findById(teamId);
    expect(after!.lineups).toEqual(before);
  });
});
