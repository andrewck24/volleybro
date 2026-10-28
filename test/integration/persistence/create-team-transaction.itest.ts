import type { ICreateTeamUseCase } from "@/applications/usecases/team/create-team.usecase";
import { PlayerRole } from "@/entities/player";
import { PlayerModel } from "@/infrastructure/db/mongoose/schemas/player";
import { Team as TeamModel } from "@/infrastructure/db/mongoose/schemas/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import mongoose from "mongoose";
import { oid } from "../support/seed";

const createTeam = (input: { name: string; userName: string }) =>
  container
    .get<ICreateTeamUseCase>(TYPES.CreateTeamUseCase)
    .execute({ ...input, userId: oid() });

describe("creating a team with its owner", () => {
  // A transaction that creates a collection on its first write can fail with a
  // catalog-change error, so the collections exist before any transaction runs.
  beforeAll(async () => {
    await TeamModel.createCollection();
    await PlayerModel.createCollection();
  });

  it("persists the team and its owner together", async () => {
    const team = await createTeam({ name: "Paired", userName: "Owner" });

    expect(await TeamModel.countDocuments({ _id: team.id })).toBe(1);
    const owner = await PlayerModel.findOne({
      teamId: team.id,
      _id: team.ownerPlayerId,
    });
    expect(owner!.role).toBe(PlayerRole.ADMIN);
    expect(team.ownerPlayerId).toBe(owner!.id);
    expect((await TeamModel.findById(team.id))!.ownerPlayerId?.toString()).toBe(
      owner!.id,
    );
    expect(await PlayerModel.countDocuments({ teamId: team.id })).toBe(1);
  });

  it("retries the whole creation when the database reports a transient conflict", async () => {
    // Fails the first insert once as a write conflict the driver may retry;
    // appName keeps the server-wide failpoint off other test files.
    await mongoose.connection.db!.admin().command({
      configureFailPoint: "failCommand",
      mode: { times: 1 },
      data: {
        failCommands: ["insert"],
        errorCode: 112,
        errorLabels: ["TransientTransactionError"],
        appName: mongoose.connection.getClient().options.appName,
      },
    });

    const team = await createTeam({ name: "Retried", userName: "Owner" });

    expect(await TeamModel.countDocuments({ name: "Retried" })).toBe(1);
    expect(await PlayerModel.countDocuments({ teamId: team.id })).toBe(1);
  });

  it("leaves no team behind when the owner cannot be written", async () => {
    // An empty owner name fails the player schema after the team is inserted.
    await expect(
      createTeam({ name: "Orphan", userName: "" }),
    ).rejects.toThrow();

    expect(await TeamModel.countDocuments({ name: "Orphan" })).toBe(0);
  });
});
