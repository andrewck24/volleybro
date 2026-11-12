import mongoose from "mongoose";
import type { ICreateTeamUseCase } from "@/applications/usecases/team/create-team.usecase";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { ITransactionRunner } from "@/applications/services/transaction/transaction-runner.interface";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { Position } from "@/entities/team";
import { PlayerModel } from "@/infrastructure/db/mongoose/schemas/player";
import { Team as TeamModel } from "@/infrastructure/db/mongoose/schemas/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { withFailPoint } from "../support/failpoint";
import { oid } from "../support/seed";

const createTeam = (
  input: { name: string; userName: string },
  userId: string = oid(),
) =>
  container
    .get<ICreateTeamUseCase>(TYPES.CreateTeamUseCase)
    .execute({ ...input, userId });

describe("creating a team with its owner", () => {
  beforeAll(async () => {
    await TeamModel.createCollection();
    await PlayerModel.createCollection();
  });

  it("fails the failpoint lock with its own deadline before Jest timeout", async () => {
    const locks = mongoose.connection
      .getClient()
      .db("itest-locks")
      .collection<{ _id: string }>("failpoints");
    let lockAcquired = false;
    while (!lockAcquired) {
      try {
        await locks.insertOne({ _id: "failCommand" });
        lockAcquired = true;
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }

    const startTime = Date.now();
    let elapsed = 0;
    let rejectedAt: number | undefined;
    const now = jest
      .spyOn(Date, "now")
      .mockImplementation(() => startTime + elapsed);
    const attempt = withFailPoint(
      "alwaysOn",
      { failCommands: ["insert"], errorCode: 112 },
      async () => undefined,
    ).catch((error: unknown) => {
      rejectedAt = elapsed;
      throw error;
    });
    const deadlineTick = setTimeout(() => {
      elapsed = 4_001;
    }, 0);
    const safetyTick = setTimeout(() => {
      elapsed = 100_000;
    }, 3_000);

    try {
      await expect(attempt).rejects.toThrow(
        "Another test file never released the failpoint lock",
      );
      expect(rejectedAt).toBe(4_001);
    } finally {
      clearTimeout(deadlineTick);
      clearTimeout(safetyTick);
      now.mockRestore();
      await locks.deleteOne({ _id: "failCommand" });
    }
  });

  it("persists the team and its owner together", async () => {
    const userId = oid();
    const team = await createTeam(
      { name: "Paired", userName: "Owner" },
      userId,
    );

    expect(await TeamModel.countDocuments({ _id: team.id })).toBe(1);
    const owner = await PlayerModel.findOne({
      teamId: team.id,
      _id: team.ownerPlayerId,
    });
    expect(owner!.role).toBe(PlayerRole.ADMIN);
    expect(owner!.status).toBe(PlayerStatus.JOINED);
    expect(owner!.userId?.toString()).toBe(userId);
    expect(team.ownerPlayerId).toBe(owner!.id);
    expect((await TeamModel.findById(team.id))!.ownerPlayerId?.toString()).toBe(
      owner!.id,
    );
    expect(await PlayerModel.countDocuments({ teamId: team.id })).toBe(1);
  });

  it("retries the whole creation when the database reports a transient conflict", async () => {
    const team = await withFailPoint(
      { times: 1 },
      {
        failCommands: ["insert"],
        errorCode: 112,
        errorLabels: ["TransientTransactionError"],
      },
      () => createTeam({ name: "Retried", userName: "Owner" }),
    );

    expect(await TeamModel.countDocuments({ name: "Retried" })).toBe(1);
    expect(await PlayerModel.countDocuments({ teamId: team.id })).toBe(1);
  });

  it("retries repository writes after a transaction network failure", async () => {
    const teamRepository = container.get<ITeamRepository>(TYPES.TeamRepository);
    const playerRepository = container.get<IPlayerRepository>(
      TYPES.PlayerRepository,
    );
    const transactionRunner = container.get<ITransactionRunner>(
      TYPES.TransactionRunner,
    );
    let callbackRuns = 0;

    const result = await withFailPoint(
      { times: 1 },
      { failCommands: ["insert"], closeConnection: true },
      () =>
        transactionRunner.run(async () => {
          callbackRuns += 1;
          const team = await teamRepository.create({
            name: "Network retry",
            lineups: new Array(3).fill({
              options: {
                liberoReplaceMode: 0,
                liberoReplacePosition: Position.NONE,
              },
              starting: new Array(6).fill({ id: null }),
              liberos: [],
              substitutes: [],
            }),
          });
          const owner = await playerRepository.create({
            name: "Network retry owner",
            status: PlayerStatus.JOINED,
            number: 1,
            role: PlayerRole.ADMIN,
            teamId: team.id,
            userId: oid(),
          });

          return { team, owner };
        }),
    );

    expect(callbackRuns).toBe(2);
    expect(
      await TeamModel.countDocuments({
        _id: result.team.id,
        name: "Network retry",
      }),
    ).toBe(1);
    expect(
      await PlayerModel.countDocuments({
        _id: result.owner.id,
        teamId: result.team.id,
      }),
    ).toBe(1);
  });

  it("does not retry an unlabelled network error", async () => {
    const transactionRunner = container.get<ITransactionRunner>(
      TYPES.TransactionRunner,
    );
    let callbackRuns = 0;

    await expect(
      transactionRunner.run(async () => {
        callbackRuns += 1;
        await TeamModel.create({ name: "Unlabelled failure", lineups: [] });
        throw new mongoose.mongo.MongoNetworkError("unlabelled network error");
      }),
    ).rejects.toMatchObject({ code: "TRANSIENT", httpStatus: 503 });

    expect(callbackRuns).toBe(1);
    expect(await TeamModel.countDocuments({ name: "Unlabelled failure" })).toBe(
      0,
    );
  });

  it("leaves no team behind when the owner cannot be written", async () => {
    await expect(
      createTeam({ name: "Orphan", userName: "" }),
    ).rejects.toThrow();

    expect(await TeamModel.countDocuments({ name: "Orphan" })).toBe(0);
  });
});
