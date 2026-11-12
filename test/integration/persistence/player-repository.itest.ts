import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import {
  ConflictError,
  NotFoundError,
  PlayerReason,
  TransientError,
} from "@/entities/errors";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { normalizeEmail } from "@/entities/user";
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

  it("refuses a second seat for the same account in a team as already on the roster", async () => {
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
      reason: PlayerReason.ALREADY_ON_ROSTER,
    });
  });

  it("reports a temporary failure when the seat lookup after a collision cannot reach the database", async () => {
    await PlayerModel.init();
    const seat = {
      name: "Member",
      status: PlayerStatus.JOINED,
      teamId,
      userId: oid(),
      role: PlayerRole.MEMBER,
    } as const;
    await players().create(seat);
    const lookup = jest.spyOn(PlayerModel, "exists").mockRejectedValue(
      Object.assign(new Error("connection reset"), {
        name: "MongoNetworkError",
      }),
    );

    try {
      await expect(
        players().create({ ...seat, name: "Twin" }),
      ).rejects.toBeInstanceOf(TransientError);
    } finally {
      lookup.mockRestore();
    }
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
        PlayerRole.MEMBER,
        PlayerRole.ADMIN,
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
      await players().updateRoleIf(oid(), PlayerRole.ADMIN, PlayerRole.MEMBER),
    ).toBeNull();
  });

  describe("email invitations", () => {
    const email = normalizeEmail("alice@example.com");
    const invited = (overrides: Record<string, unknown>) =>
      PlayerModel.create({
        name: "Invitee",
        status: PlayerStatus.INVITED,
        role: PlayerRole.MEMBER,
        teamId: oid(),
        ...overrides,
      });

    it("finds a user's players together with the invitations to their address", async () => {
      const userId = oid();
      await invited({ name: "Mine", userId });
      await invited({ name: "ByEmail", email });
      await invited({ name: "OtherUser", userId: oid() });
      await invited({ name: "OtherEmail", email: "bob@example.com" });

      const found = await players().findByUserIdOrInvitedEmail(userId, email);

      expect(found.map((p) => p.name).sort()).toEqual(["ByEmail", "Mine"]);
    });

    it("ignores rows that carry the address without being invitations", async () => {
      await PlayerModel.create({
        name: "Stale",
        status: PlayerStatus.NONE,
        teamId: oid(),
        email,
      });

      expect(await players().findByUserIdOrInvitedEmail(oid(), email)).toEqual(
        [],
      );
    });

    it("links invitations stored under the lowercase address exactly", async () => {
      const userId = oid();
      await invited({ name: "Exact", email });
      await invited({ name: "Mixed", email: "Alice@example.com" });

      expect(await players().linkUserToInvitations(email, userId)).toBe(1);

      const mine = await players().findByUserId(userId);
      expect(mine.map((p) => p.name)).toEqual(["Exact"]);
      expect(mine[0]).not.toHaveProperty("email");
    });
  });
});
