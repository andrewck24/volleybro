import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { ITransactionRunner } from "@/applications/services/transaction/transaction-runner.interface";
import type { ILeaveTeamUseCase } from "@/applications/usecases/player/leave-team.usecase";
import type { IRemovePlayerUseCase } from "@/applications/usecases/player/remove-player.usecase";
import { LeaveTeamUseCase } from "@/applications/usecases/player/leave-team.usecase";
import { RemovePlayerUseCase } from "@/applications/usecases/player/remove-player.usecase";
import { TransferOwnershipUseCase } from "@/applications/usecases/player/transfer-ownership.usecase";
import {
  ConflictError,
  AuthorizationError,
  PlayerReason,
} from "@/entities/errors";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { Position } from "@/entities/team";
import { PlayerModel } from "@/infrastructure/db/mongoose/schemas/player";
import { Team as TeamModel } from "@/infrastructure/db/mongoose/schemas/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { barrier, releaseGates } from "@test/support/gates";
import { withFailPoint } from "../support/failpoint";
import { oid } from "../support/seed";

const createMembership = async (targetRole = PlayerRole.MEMBER) => {
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
      role: targetRole,
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

  return { teamId, playerId, playerUserId, ownerPlayerId, ownerUserId };
};

const createAdminMembership = () => createMembership(PlayerRole.ADMIN);

const leaveTeam = (playerId: string, userId: string) =>
  container
    .get<ILeaveTeamUseCase>(TYPES.LeaveTeamUseCase)
    .execute({ playerId, userId });

const removePlayer = (playerId: string, userId: string) =>
  container
    .get<IRemovePlayerUseCase>(TYPES.RemovePlayerUseCase)
    .execute({ playerId, userId });

const teamRepository = () =>
  container.get<ITeamRepository>(TYPES.TeamRepository);
const playerRepository = () =>
  container.get<IPlayerRepository>(TYPES.PlayerRepository);
const transactionRunner = () =>
  container.get<ITransactionRunner>(TYPES.TransactionRunner);

const runAfter = (compete: () => Promise<unknown>): ITransactionRunner => ({
  async run<T>(operation: () => Promise<T>): Promise<T> {
    await compete();
    return transactionRunner().run(operation);
  },
});

const leaveTeamWith = (runner: ITransactionRunner) =>
  new LeaveTeamUseCase(playerRepository(), teamRepository(), runner);
const removePlayerWith = (runner: ITransactionRunner) =>
  new RemovePlayerUseCase(playerRepository(), teamRepository(), runner);
const transferOwnershipWith = (runner: ITransactionRunner) =>
  new TransferOwnershipUseCase(playerRepository(), teamRepository(), runner);

const transferOwnership = (
  teamId: string,
  newOwnerId: string,
  userId: string,
) =>
  container
    .get<TransferOwnershipUseCase>(TYPES.TransferOwnershipUseCase)
    .execute({ teamId, newOwnerId, userId });

const withWriteFailure = (
  run: () => Promise<unknown>,
  failure: { errorCode: number; errorLabels?: string[] },
) =>
  withFailPoint(
    { times: 1 },
    { failCommands: ["findAndModify"], ...failure },
    run,
  );

afterEach(() => releaseGates());

const expectPlayerInLineup = async (teamId: string, playerId: string) => {
  const team = await TeamModel.findById(teamId).lean();
  expect(team?.lineups[0]?.starting[0]?.playerId?.toString()).toBe(playerId);
};

const expectPlayerOutOfLineup = async (teamId: string) => {
  const team = await TeamModel.findById(teamId).lean();
  expect(team?.lineups[0]?.starting[0]?.playerId).toBeNull();
};

const expectOwner = async (teamId: string, ownerPlayerId: string) => {
  const team = await TeamModel.findById(teamId).lean();
  expect(team?.ownerPlayerId?.toString()).toBe(ownerPlayerId);
};

const expectRefusal = async (
  attempt: Promise<unknown>,
  ErrorType: typeof AuthorizationError | typeof ConflictError,
  reason: PlayerReason,
  detail: string,
) => {
  await expect(attempt).rejects.toBeInstanceOf(ErrorType);
  await expect(attempt).rejects.toMatchObject({ detail, reason });
};

const playerSnapshot = async (playerId: string) =>
  (await PlayerModel.findById(playerId))?.toJSON();

describe("membership removal transactions", () => {
  it("rolls back lineup removal when leave's player update fails", async () => {
    const membership = await createMembership();
    const before = await playerSnapshot(membership.playerId);

    await expect(
      withWriteFailure(
        () => leaveTeam(membership.playerId, membership.playerUserId),
        { errorCode: 2 },
      ),
    ).rejects.toThrow();

    await expectPlayerInLineup(membership.teamId, membership.playerId);
    expect(await playerSnapshot(membership.playerId)).toEqual(before);
  });

  it("retries leave after one transient player update conflict", async () => {
    const membership = await createMembership();

    await withWriteFailure(
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
      withWriteFailure(
        () => removePlayer(membership.playerId, membership.ownerUserId),
        { errorCode: 2 },
      ),
    ).rejects.toThrow();

    await expectPlayerInLineup(membership.teamId, membership.playerId);
    expect(await playerSnapshot(membership.playerId)).toEqual(before);
  });

  it("retries remove after one transient player delete conflict", async () => {
    const membership = await createMembership();

    await withWriteFailure(
      () => removePlayer(membership.playerId, membership.ownerUserId),
      {
        errorCode: 112,
        errorLabels: ["TransientTransactionError"],
      },
    );

    await expectPlayerOutOfLineup(membership.teamId);
    expect(await PlayerModel.findById(membership.playerId)).toBeNull();
  });

  it("refuses leave after a transfer made the leaver the owner", async () => {
    const membership = await createAdminMembership();
    const before = await playerSnapshot(membership.playerId);
    const leave = leaveTeamWith(
      runAfter(() =>
        transferOwnership(
          membership.teamId,
          membership.playerId,
          membership.ownerUserId,
        ),
      ),
    );

    await expectRefusal(
      leave.execute({
        playerId: membership.playerId,
        userId: membership.playerUserId,
      }),
      AuthorizationError,
      PlayerReason.OWNER_CANNOT_LEAVE,
      "Team owner cannot leave the team",
    );

    await expectOwner(membership.teamId, membership.playerId);
    await expectPlayerInLineup(membership.teamId, membership.playerId);
    expect(await playerSnapshot(membership.playerId)).toEqual(before);
  });

  it("refuses removal after a transfer made the target the owner", async () => {
    const membership = await createAdminMembership();
    const before = await playerSnapshot(membership.playerId);
    const remove = removePlayerWith(
      runAfter(() =>
        transferOwnership(
          membership.teamId,
          membership.playerId,
          membership.ownerUserId,
        ),
      ),
    );

    await expectRefusal(
      remove.execute({
        playerId: membership.playerId,
        userId: membership.ownerUserId,
      }),
      AuthorizationError,
      PlayerReason.TARGET_IS_OWNER,
      "The owner can only leave the role by transferring it",
    );

    await expectOwner(membership.teamId, membership.playerId);
    await expectPlayerInLineup(membership.teamId, membership.playerId);
    expect(await playerSnapshot(membership.playerId)).toEqual(before);
  });

  it("rolls back transfer after the target left between check and transaction", async () => {
    const membership = await createAdminMembership();
    const transfer = transferOwnershipWith(
      runAfter(() => leaveTeam(membership.playerId, membership.playerUserId)),
    );

    await expectRefusal(
      transfer.execute({
        teamId: membership.teamId,
        newOwnerId: membership.playerId,
        userId: membership.ownerUserId,
      }),
      ConflictError,
      PlayerReason.TARGET_NOT_MEMBER,
      "Target player must be an active member of the team",
    );

    await expectOwner(membership.teamId, membership.ownerPlayerId);
    await expectPlayerOutOfLineup(membership.teamId);
    const player = await PlayerModel.findById(membership.playerId).lean();
    expect(player).toMatchObject({ status: PlayerStatus.NONE });
    expect(player?.userId).toBeUndefined();
    expect(player?.role).toBeUndefined();
  });

  it("rolls back transfer after the target was removed between check and transaction", async () => {
    const membership = await createAdminMembership();
    const transfer = transferOwnershipWith(
      runAfter(() => removePlayer(membership.playerId, membership.ownerUserId)),
    );

    await expectRefusal(
      transfer.execute({
        teamId: membership.teamId,
        newOwnerId: membership.playerId,
        userId: membership.ownerUserId,
      }),
      ConflictError,
      PlayerReason.TARGET_NOT_MEMBER,
      "Target player must be an active member of the team",
    );

    await expectOwner(membership.teamId, membership.ownerPlayerId);
    await expectPlayerOutOfLineup(membership.teamId);
    expect(await PlayerModel.findById(membership.playerId)).toBeNull();
  });

  it("conflicts ownership transfer with concurrent removal", async () => {
    const membership = await createAdminMembership();
    const transactionBarrier = barrier(2);
    const runner: ITransactionRunner = {
      async run<T>(operation: () => Promise<T>): Promise<T> {
        return transactionRunner().run(async () => {
          await transactionBarrier.wait();
          return operation();
        });
      },
    };
    const operations = [
      transferOwnershipWith(runner).execute({
        teamId: membership.teamId,
        newOwnerId: membership.playerId,
        userId: membership.ownerUserId,
      }),
      removePlayerWith(runner).execute({
        playerId: membership.playerId,
        userId: membership.ownerUserId,
      }),
    ];
    let failedBeforeBothTransactions = false;
    let failure: unknown;
    try {
      const settledBeforeBothTransactions = Promise.race(
        operations.map((operation) =>
          operation.then(
            () =>
              Promise.reject(
                new Error(
                  "An operation finished before both transactions started",
                ),
              ),
            (error) => Promise.reject(error),
          ),
        ),
      );
      await Promise.race([
        transactionBarrier.ready,
        settledBeforeBothTransactions,
      ]);
    } catch (error) {
      failedBeforeBothTransactions = true;
      failure = error;
    } finally {
      transactionBarrier.release();
      releaseGates();
    }
    const results = await Promise.allSettled(operations);
    if (failedBeforeBothTransactions) throw failure;

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const target = await PlayerModel.findById(membership.playerId).lean();
    if (target) {
      expect(target.status).toBe(PlayerStatus.JOINED);
      expect(target.role).toBe(PlayerRole.ADMIN);
      await expectOwner(membership.teamId, membership.playerId);
      await expectPlayerInLineup(membership.teamId, membership.playerId);
    } else {
      await expectOwner(membership.teamId, membership.ownerPlayerId);
      await expectPlayerOutOfLineup(membership.teamId);
    }
  });

  it("retries transfer after one transient team write conflict", async () => {
    const membership = await createAdminMembership();

    await withWriteFailure(
      () =>
        transferOwnership(
          membership.teamId,
          membership.playerId,
          membership.ownerUserId,
        ),
      { errorCode: 112, errorLabels: ["TransientTransactionError"] },
    );

    await expectOwner(membership.teamId, membership.playerId);
    expect(
      await PlayerModel.findById(membership.playerId).lean(),
    ).toMatchObject({ status: PlayerStatus.JOINED, role: PlayerRole.ADMIN });
  });

  it("writes the team document when the removed player is in no lineup", async () => {
    const membership = await createMembership();
    const oldUpdatedAt = new Date(0);
    await TeamModel.updateOne(
      { _id: membership.teamId },
      { $set: { lineups: [], updatedAt: oldUpdatedAt } },
      { timestamps: false },
    );

    expect(
      await teamRepository().removeNonOwnerFromLineups(
        membership.teamId,
        membership.playerId,
      ),
    ).toBe(true);
    const updated = await TeamModel.findById(membership.teamId);

    expect(updated?.lineups).toEqual([]);
    expect((updated?.get("updatedAt") as Date).getTime()).toBeGreaterThan(
      oldUpdatedAt.getTime(),
    );
  });
});
