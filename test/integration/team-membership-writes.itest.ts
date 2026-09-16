import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { ICreateInvitationUseCase } from "@/applications/usecases/player/create-invitation.usecase";
import type { ICreatePlayerUseCase } from "@/applications/usecases/player/create-player.usecase";
import type { ILeaveTeamUseCase } from "@/applications/usecases/player/leave-team.usecase";
import type { IUpdateRoleUseCase } from "@/applications/usecases/player/update-role.usecase";
import { PlayerReason } from "@/entities/errors";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { User as UserModel } from "@/infrastructure/db/mongoose/schemas/user";
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

/**
 * Whether an address reaches an account is decided by the database's collation,
 * which no repository double can stand in for.
 */
describe("invitations reach the account behind the address", () => {
  let teamId: string;
  const ownerUserId = "0".repeat(24);

  const register = async (email: string) => {
    const user = await UserModel.create({ name: email, email });
    return user._id!.toString();
  };

  const seatFor = async (name: string) =>
    (
      await container
        .get<ICreatePlayerUseCase>(TYPES.CreatePlayerUseCase)
        .execute({ teamId, data: { name }, userId: ownerUserId })
    ).id;

  const invite = (playerId: string, email: string) =>
    container
      .get<ICreateInvitationUseCase>(TYPES.CreateInvitationUseCase)
      .execute({
        playerId,
        email,
        role: PlayerRole.MEMBER,
        userId: ownerUserId,
      });

  beforeEach(async () => {
    useFakeAuth();
    const team = await container
      .get<ITeamRepository>(TYPES.TeamRepository)
      .create({ name: "Invite Team", lineups: [] } as Parameters<
        ITeamRepository["create"]
      >[0]);
    teamId = team.id;
    await players().create({
      name: "Owner",
      status: PlayerStatus.JOINED,
      teamId,
      userId: ownerUserId,
      role: PlayerRole.OWNER,
    });
  });

  it("links the invitation to the registered account, keeping no email", async () => {
    const userId = await register("alice@example.com");
    const seat = await seatFor("Alice");

    const invited = await invite(seat, "alice@example.com");

    expect(invited).toMatchObject({ status: PlayerStatus.INVITED, userId });
    expect(invited).not.toHaveProperty("email");
  });

  it("links an address that differs only in case", async () => {
    const userId = await register("Bob@Example.com");
    const seat = await seatFor("Bob");

    expect(await invite(seat, " bob@example.com ")).toMatchObject({ userId });
  });

  it("does not let a dot in the address reach another account", async () => {
    await register("axb@x.com");
    const seat = await seatFor("Dotted");

    const invited = await invite(seat, "a.b@x.com");

    expect(invited).toMatchObject({ email: "a.b@x.com" });
    expect(invited).not.toHaveProperty("userId");
  });

  it("refuses to guess between two accounts differing only in case", async () => {
    await register("Twin@example.com");
    await register("twin@example.com");
    const seat = await seatFor("Twin");

    await expect(invite(seat, "twin@example.com")).rejects.toMatchObject({
      reason: PlayerReason.AMBIGUOUS_EMAIL,
    });
  });

  it("refuses an account that already holds a seat on this team", async () => {
    const userId = await register("carol@example.com");
    await players().create({
      name: "Carol",
      status: PlayerStatus.JOINED,
      teamId,
      userId,
      role: PlayerRole.MEMBER,
    });
    const seat = await seatFor("Carol again");

    await expect(invite(seat, "carol@example.com")).rejects.toMatchObject({
      reason: PlayerReason.ALREADY_ON_ROSTER,
    });
  });

  it("refuses an unregistered address this team already invited", async () => {
    const first = await seatFor("Dave");
    await invite(first, "dave@example.com");
    const second = await seatFor("Dave again");

    await expect(invite(second, "dave@example.com")).rejects.toMatchObject({
      reason: PlayerReason.ALREADY_ON_ROSTER,
    });
  });

  it("creates a linked invitee straight from create-player", async () => {
    const userId = await register("erin@example.com");

    await container
      .get<ICreatePlayerUseCase>(TYPES.CreatePlayerUseCase)
      .execute({
        teamId,
        data: { name: "Erin", email: "Erin@example.com" },
        userId: ownerUserId,
      });

    const created = (await roster(teamId)).find((p) => p.name === "Erin");
    expect(created).toMatchObject({ status: PlayerStatus.INVITED, userId });
    expect(created).not.toHaveProperty("email");
  });
});
