import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import { NotFoundError } from "@/entities/errors";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { oid } from "../support/seed";

const profiles = () =>
  container.get<IProfileRepository>(TYPES.ProfileRepository);

describe("profile reads and writes", () => {
  it("finds no profile for a user without one", async () => {
    expect(await profiles().findByUserId(oid())).toBeNull();
  });

  it("stores a profile and reads it back with string ids", async () => {
    const userId = oid();
    const activeTeamId = oid();

    const created = await profiles().create({ userId, activeTeamId });

    expect(created).toMatchObject({ userId, activeTeamId });
    expect(await profiles().findByUserId(userId)).toEqual(created);
  });

  it("persists the fields an update changes", async () => {
    const { id, userId } = await profiles().create({
      userId: oid(),
      preferences: { theme: "light" },
    });

    const updated = await profiles().update(id, {
      preferences: { theme: "dark" },
    });

    expect(updated.preferences).toEqual({ theme: "dark" });
    expect((await profiles().findByUserId(userId))!.preferences).toEqual({
      theme: "dark",
    });
  });

  it("refuses to update a profile that does not exist", async () => {
    await expect(profiles().update(oid(), { info: {} })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("sets the active team, and clears it when given null", async () => {
    const { userId } = await profiles().create({ userId: oid() });
    const teamId = oid();

    const set = await profiles().updateActiveTeamId(userId, teamId);
    expect(set).toMatchObject({ activeTeamId: teamId });

    const cleared = await profiles().updateActiveTeamId(userId, null);
    expect(cleared!.activeTeamId).toBeUndefined();
    expect(
      (await profiles().findByUserId(userId))!.activeTeamId,
    ).toBeUndefined();
  });

  it("finds no profile to set an active team on for a user without one", async () => {
    expect(await profiles().updateActiveTeamId(oid(), oid())).toBeNull();
  });
});
