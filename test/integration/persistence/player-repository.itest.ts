import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { CommonReason, ConflictError, NotFoundError } from "@/entities/errors";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { PlayerModel } from "@/infrastructure/db/mongoose/schemas/player";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { oid } from "../support/seed";

const players = () => container.get<IPlayerRepository>(TYPES.PlayerRepository);

describe("player reads and writes", () => {
  const teamId = oid();

  it("finds no player for an id nobody holds", async () => {
    expect(await players().findById(oid())).toBeNull();
  });

  it("refuses to update a player that does not exist", async () => {
    await expect(
      players().update(oid(), { name: "Nobody" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("removes a player, and reports whether there was one to remove", async () => {
    const { id } = await players().create({
      name: "Leaving",
      status: PlayerStatus.NONE,
      teamId,
    });

    expect(await players().delete(id)).toBe(true);
    expect(await players().findById(id)).toBeNull();
    expect(await players().delete(id)).toBe(false);
  });

  it("reports a second seat for the same account in a team as a conflict", async () => {
    await PlayerModel.init();
    const userId = oid();
    const seat = {
      name: "Member",
      status: PlayerStatus.JOINED,
      teamId,
      userId,
      role: PlayerRole.MEMBER,
    } as const;
    await players().create(seat);

    const rejection = players().create({ ...seat, name: "Twin" });

    await expect(rejection).rejects.toBeInstanceOf(ConflictError);
    await expect(rejection).rejects.toMatchObject({
      reason: CommonReason.DUPLICATE_RESOURCE,
    });
  });

  it("refuses a second OWNER in a team, and lets another team have its own", async () => {
    await PlayerModel.init();
    const team = oid();
    const owner = (name: string, teamId: string) =>
      players().create({
        name,
        status: PlayerStatus.JOINED,
        teamId,
        userId: oid(),
        role: PlayerRole.OWNER,
      });
    await owner("First", team);

    const rejection = owner("Second", team);

    await expect(rejection).rejects.toBeInstanceOf(ConflictError);
    await expect(rejection).rejects.toMatchObject({
      reason: CommonReason.DUPLICATE_RESOURCE,
    });
    await expect(owner("Elsewhere", oid())).resolves.toBeDefined();
  });

  it("changes a role only while the player still holds the expected one", async () => {
    const admin = await players().create({
      name: "Admin",
      status: PlayerStatus.JOINED,
      teamId: oid(),
      userId: oid(),
      role: PlayerRole.ADMIN,
    });

    expect(
      await players().updateRoleIf(
        admin.id,
        PlayerRole.OWNER,
        PlayerRole.MEMBER,
      ),
    ).toBeNull();
    expect(await players().findById(admin.id)).toMatchObject({
      role: PlayerRole.ADMIN,
    });

    expect(
      await players().updateRoleIf(
        admin.id,
        PlayerRole.ADMIN,
        PlayerRole.MEMBER,
      ),
    ).toMatchObject({ role: PlayerRole.MEMBER });
  });

  it("changes no role for a player that does not exist", async () => {
    expect(
      await players().updateRoleIf(oid(), PlayerRole.ADMIN, PlayerRole.OWNER),
    ).toBeNull();
  });
});
