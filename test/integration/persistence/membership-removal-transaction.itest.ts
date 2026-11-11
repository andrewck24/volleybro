import type { ILeaveTeamUseCase } from "@/applications/usecases/player/leave-team.usecase";
import type { IRemovePlayerUseCase } from "@/applications/usecases/player/remove-player.usecase";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { Position } from "@/entities/team";
import { PlayerModel } from "@/infrastructure/db/mongoose/schemas/player";
import { Team as TeamModel } from "@/infrastructure/db/mongoose/schemas/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { withFailPoint } from "../support/failpoint";
import { oid } from "../support/seed";

const createMembership = async () => {
  const teamId = oid();
  const playerId = oid();
  const playerUserId = oid();
  const ownerPlayerId = oid();
  const ownerUserId = oid();

  await TeamModel.create({
    _id: teamId,
    name: "Transaction Membership",
    ownerPlayerId,
    lineups: [
      {
        starting: [{ playerId, position: Position.OH }],
        liberos: [],
        substitutes: [],
      },
    ],
  });
  await PlayerModel.create([
    {
      _id: playerId,
      name: "Target",
      status: PlayerStatus.JOINED,
      teamId,
      userId: playerUserId,
      role: PlayerRole.MEMBER,
    },
    {
      _id: ownerPlayerId,
      name: "Owner",
      status: PlayerStatus.JOINED,
      teamId,
      userId: ownerUserId,
      role: PlayerRole.ADMIN,
    },
  ]);

  return { teamId, playerId, playerUserId, ownerUserId };
};

const leaveTeam = (playerId: string, userId: string) =>
  container
    .get<ILeaveTeamUseCase>(TYPES.LeaveTeamUseCase)
    .execute({ playerId, userId });

const removePlayer = (playerId: string, userId: string) =>
  container
    .get<IRemovePlayerUseCase>(TYPES.RemovePlayerUseCase)
    .execute({ playerId, userId });

const withPlayerWriteFailure = (
  run: () => Promise<unknown>,
  failure: { errorCode: number; errorLabels?: string[] },
) =>
  withFailPoint(
    { times: 1 },
    { failCommands: ["findAndModify"], ...failure },
    run,
  );

const expectPlayerInLineup = async (teamId: string, playerId: string) => {
  const team = await TeamModel.findById(teamId).lean();
  expect(team?.lineups[0]?.starting[0]?.playerId?.toString()).toBe(playerId);
};

const expectPlayerOutOfLineup = async (teamId: string) => {
  const team = await TeamModel.findById(teamId).lean();
  expect(team?.lineups[0]?.starting[0]?.playerId).toBeNull();
};

const playerSnapshot = async (playerId: string) =>
  (await PlayerModel.findById(playerId))?.toJSON();

describe("membership removal transactions", () => {
  it("rolls back lineup removal when leave's player update fails", async () => {
    const membership = await createMembership();
    const before = await playerSnapshot(membership.playerId);

    await expect(
      withPlayerWriteFailure(
        () => leaveTeam(membership.playerId, membership.playerUserId),
        { errorCode: 2 },
      ),
    ).rejects.toThrow();

    await expectPlayerInLineup(membership.teamId, membership.playerId);
    expect(await playerSnapshot(membership.playerId)).toEqual(before);
  });

  it("retries leave after one transient player update conflict", async () => {
    const membership = await createMembership();

    await withPlayerWriteFailure(
      () => leaveTeam(membership.playerId, membership.playerUserId),
      {
        errorCode: 112,
        errorLabels: ["TransientTransactionError"],
      },
    );

    await expectPlayerOutOfLineup(membership.teamId);
    const player = await PlayerModel.findById(membership.playerId).lean();
    expect(player).toMatchObject({
      status: PlayerStatus.NONE,
      teamId: expect.anything(),
    });
    expect(player?.teamId?.toString()).toBe(membership.teamId);
    expect(player?.userId).toBeUndefined();
    expect(player?.email).toBeUndefined();
    expect(player?.role).toBeUndefined();
  });

  it("rolls back lineup removal when remove's player delete fails", async () => {
    const membership = await createMembership();
    const before = await playerSnapshot(membership.playerId);

    await expect(
      withPlayerWriteFailure(
        () => removePlayer(membership.playerId, membership.ownerUserId),
        { errorCode: 2 },
      ),
    ).rejects.toThrow();

    await expectPlayerInLineup(membership.teamId, membership.playerId);
    expect(await playerSnapshot(membership.playerId)).toEqual(before);
  });

  it("retries remove after one transient player delete conflict", async () => {
    const membership = await createMembership();

    await withPlayerWriteFailure(
      () => removePlayer(membership.playerId, membership.ownerUserId),
      {
        errorCode: 112,
        errorLabels: ["TransientTransactionError"],
      },
    );

    await expectPlayerOutOfLineup(membership.teamId);
    expect(await PlayerModel.findById(membership.playerId)).toBeNull();
  });
});
