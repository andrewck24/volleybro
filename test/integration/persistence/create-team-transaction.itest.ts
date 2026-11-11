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
  // A transaction that creates a collection on its first write can fail with a
  // catalog-change error, so the collections exist before any transaction runs.
  beforeAll(async () => {
    await TeamModel.createCollection();
    await PlayerModel.createCollection();
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
    // Fails the first insert once as a write conflict the driver may retry.
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
    // An empty owner name fails the player schema after the team is inserted.
    await expect(
      createTeam({ name: "Orphan", userName: "" }),
    ).rejects.toThrow();

    expect(await TeamModel.countDocuments({ name: "Orphan" })).toBe(0);
  });
});
