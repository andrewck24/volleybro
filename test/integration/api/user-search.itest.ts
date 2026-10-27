import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { GET } from "@/app/api/users/route";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { NextRequest } from "next/server";
import { oid } from "../support/seed";

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: async () => ({ user: { id: "0".repeat(24) } }) } },
}));
jest.mock("next/headers", () => ({ headers: async () => new Headers() }));

it("denies a team member searching for an account by email", async () => {
  const teamId = oid();
  await container.get<IPlayerRepository>(TYPES.PlayerRepository).create({
    name: "Member",
    teamId,
    userId: "0".repeat(24),
    status: PlayerStatus.JOINED,
    role: PlayerRole.MEMBER,
  });
  const response = await GET(
    new NextRequest(
      `http://localhost/api/users?email=other%40example.com&teamId=${teamId}`,
    ),
  );
  expect(response.status).toBe(403);
});
