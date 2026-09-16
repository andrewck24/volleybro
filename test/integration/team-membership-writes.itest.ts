import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { ICreatePlayerUseCase } from "@/applications/usecases/player/create-player.usecase";
import type { ILeaveTeamUseCase } from "@/applications/usecases/player/leave-team.usecase";
import type { IUpdateRoleUseCase } from "@/applications/usecases/player/update-role.usecase";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { useFakeAuth } from "./support/auth";
import { oid } from "./support/seed";

/**
 * Reading a team's roster narrows every document, so one document that does not
 * fit the model takes the whole roster down. These are the write paths that used
 * to produce one, exercised against a real database and read back.
 */
const players = () => container.get<IPlayerRepository>(TYPES.PlayerRepository);

const roster = (teamId: string) => players().findByTeamId(teamId);

describe("player writes leave the roster readable", () => {
  let teamId: string;
  let ownerId: string;
  const ownerUserId = "0".repeat(24);

  beforeEach(async () => {
    useFakeAuth();
    const team = await container
      .get<ITeamRepository>(TYPES.TeamRepository)
      .create({ name: "Roster Team", lineups: [] } as Parameters<
        ITeamRepository["create"]
      >[0]);
    teamId = team.id;
    const owner = await players().create({
      name: "Owner",
      status: PlayerStatus.JOINED,
      teamId,
      userId: ownerUserId,
      role: PlayerRole.OWNER,
    });
    ownerId = owner.id;
  });

  it("creates an unlinked player without a role", async () => {
    await container
      .get<ICreatePlayerUseCase>(TYPES.CreatePlayerUseCase)
      .execute({ teamId, data: { name: "Unlinked" }, userId: ownerUserId });

    const created = (await roster(teamId)).find((p) => p.name === "Unlinked");
    expect(created).toMatchObject({ status: PlayerStatus.NONE });
    expect(created).not.toHaveProperty("role");
    expect(created).not.toHaveProperty("userId");
  });

  it("creates an invitee holding only a lowercased email", async () => {
    await container
      .get<ICreatePlayerUseCase>(TYPES.CreatePlayerUseCase)
      .execute({
        teamId,
        data: {
          name: "Invitee",
          email: " Alice@Example.COM ",
          role: PlayerRole.ADMIN,
        },
        userId: ownerUserId,
      });

    const created = (await roster(teamId)).find((p) => p.name === "Invitee");
    expect(created).toMatchObject({
      status: PlayerStatus.INVITED,
      email: "alice@example.com",
      role: PlayerRole.ADMIN,
    });
    expect(created).not.toHaveProperty("userId");
  });

  it("keeps the roster readable after a role change on an invitee", async () => {
    const invitee = await players().create({
      name: "Invitee",
      status: PlayerStatus.INVITED,
      teamId,
      email: "bob@example.com",
      role: PlayerRole.MEMBER,
    });

    await container.get<IUpdateRoleUseCase>(TYPES.UpdateRoleUseCase).execute({
      playerId: invitee.id,
      newRole: PlayerRole.ADMIN,
      userId: ownerUserId,
    });

    expect(await roster(teamId)).toHaveLength(2);
    expect(await players().findById(invitee.id)).toMatchObject({
      status: PlayerStatus.INVITED,
      role: PlayerRole.ADMIN,
    });
  });

  it("clears role and email when a member leaves the team", async () => {
    const memberUserId = oid();
    const member = await players().create({
      name: "Member",
      status: PlayerStatus.JOINED,
      teamId,
      userId: memberUserId,
      role: PlayerRole.ADMIN,
    });

    await container
      .get<ILeaveTeamUseCase>(TYPES.LeaveTeamUseCase)
      .execute({ playerId: member.id, userId: memberUserId });

    expect(await roster(teamId)).toHaveLength(2);
    const left = await players().findById(member.id);
    expect(left).toMatchObject({ status: PlayerStatus.NONE });
    expect(left).not.toHaveProperty("role");
    expect(left).not.toHaveProperty("email");
  });

  it("still reads the owner seeded by team creation", async () => {
    expect(await players().findById(ownerId)).toMatchObject({
      status: PlayerStatus.JOINED,
      role: PlayerRole.OWNER,
    });
  });
});
