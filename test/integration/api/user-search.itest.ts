import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { GET } from "@/app/api/users/route";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: async () => ({ user: { id: "0".repeat(24) } }) } },
}));
jest.mock("next/headers", () => ({ headers: async () => new Headers() }));

it("restricts team-scoped user lookup to team admins", async () => {
  const teams = container.get<ITeamRepository>(TYPES.TeamRepository);
  const players = container.get<IPlayerRepository>(TYPES.PlayerRepository);
  const [adminTeam, memberTeam] = await Promise.all([
    teams.create({ name: "Admin Search", lineups: [] } as Parameters<
      ITeamRepository["create"]
    >[0]),
    teams.create({ name: "Member Search", lineups: [] } as Parameters<
      ITeamRepository["create"]
    >[0]),
  ]);
  const sessionUserId = "0".repeat(24);
  await Promise.all([
    players.create({
      name: "Admin",
      teamId: adminTeam.id,
      userId: sessionUserId,
      status: PlayerStatus.JOINED,
      role: PlayerRole.ADMIN,
    }),
    players.create({
      name: "Member",
      teamId: memberTeam.id,
      userId: sessionUserId,
      status: PlayerStatus.JOINED,
      role: PlayerRole.MEMBER,
    }),
  ]);
  const search = (teamId: string) =>
    GET(
      new NextRequest(
        `http://localhost/api/users?email=invalid&teamId=${teamId}`,
      ),
    );

  const adminResponse = await search(adminTeam.id);
  expect(adminResponse.status).toBe(400);
  expect((await search(memberTeam.id)).status).toBe(403);
});
