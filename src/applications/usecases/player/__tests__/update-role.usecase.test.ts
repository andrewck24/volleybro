import {
  createInvitedPlayer,
  createMockPlayerRepository,
  createPlayer,
  createUnlinkedPlayer,
} from "@/__tests__/helpers";
import type { IUpdateRoleUseCase } from "@/applications/usecases/player/update-role.usecase";
import { UpdateRoleUseCase } from "@/applications/usecases/player/update-role.usecase";
import {
  AuthorizationError,
  AuthReason,
  ConflictError,
  NotFoundError,
  PlayerReason,
} from "@/entities/errors";
import { PlayerRole } from "@/entities/player";
import { beforeEach, describe, expect, it } from "@jest/globals";

describe("UpdateRoleUseCase", () => {
  let useCase: IUpdateRoleUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;

  const caller = "user-actor";

  const actor = (role: PlayerRole) =>
    createPlayer({ id: "actor", userId: caller, role });

  const targets = {
    owner: createPlayer({
      id: "target",
      userId: "user-target",
      role: PlayerRole.OWNER,
    }),
    admin: createPlayer({
      id: "target",
      userId: "user-target",
      role: PlayerRole.ADMIN,
    }),
    member: createPlayer({
      id: "target",
      userId: "user-target",
      role: PlayerRole.MEMBER,
    }),
    invitee: createInvitedPlayer({ id: "target", email: "invited@x.com" }),
    unlinked: createUnlinkedPlayer({ id: "target" }),
  };

  const expectRefusal = async (attempt: Promise<unknown>, reason: string) => {
    await expect(attempt).rejects.toBeInstanceOf(AuthorizationError);
    await expect(attempt).rejects.toMatchObject({ reason });
    expect(mockPlayerRepository.update).not.toHaveBeenCalled();
  };

  const update = () =>
    useCase.execute({
      playerId: "target",
      newRole: PlayerRole.ADMIN,
      userId: caller,
    });

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    useCase = new UpdateRoleUseCase(mockPlayerRepository);
    mockPlayerRepository.update.mockResolvedValue(
      createPlayer({
        id: "target",
        userId: "user-target",
        role: PlayerRole.ADMIN,
      }),
    );
  });

  describe("targets an admin may change", () => {
    beforeEach(() => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        actor(PlayerRole.ADMIN),
      );
    });

    it.each(["admin", "member", "invitee"] as const)(
      "changes the role of %s",
      async (kind) => {
        mockPlayerRepository.findById.mockResolvedValue(targets[kind]);

        expect(await update()).toMatchObject({ role: PlayerRole.ADMIN });
      },
    );

    it("refuses the owner, who can only hand ownership over", async () => {
      mockPlayerRepository.findById.mockResolvedValue(targets.owner);

      await expectRefusal(update(), PlayerReason.TARGET_IS_OWNER);
    });

    it("refuses the caller's own player", async () => {
      const self = actor(PlayerRole.ADMIN);
      mockPlayerRepository.findById.mockResolvedValue(self);

      await expectRefusal(
        useCase.execute({
          playerId: self.id,
          newRole: PlayerRole.MEMBER,
          userId: caller,
        }),
        PlayerReason.TARGET_IS_SELF,
      );
    });

    it("refuses an unlinked player, who has no role", async () => {
      mockPlayerRepository.findById.mockResolvedValue(targets.unlinked);

      const attempt = update();

      await expect(attempt).rejects.toBeInstanceOf(ConflictError);
      await expect(attempt).rejects.toMatchObject({
        reason: PlayerReason.TARGET_NOT_LINKED,
      });
      expect(mockPlayerRepository.update).not.toHaveBeenCalled();
    });
  });

  it("lets the owner change an admin", async () => {
    mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
      actor(PlayerRole.OWNER),
    );
    mockPlayerRepository.findById.mockResolvedValue(targets.admin);

    expect(await update()).toMatchObject({ role: PlayerRole.ADMIN });
  });

  it("refuses a caller who is a member without a role to grant", async () => {
    mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
      actor(PlayerRole.MEMBER),
    );
    mockPlayerRepository.findById.mockResolvedValue(targets.member);

    await expectRefusal(update(), AuthReason.INSUFFICIENT_ROLE);
  });

  it("refuses a caller with no player on the team", async () => {
    mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);
    mockPlayerRepository.findById.mockResolvedValue(targets.member);

    await expectRefusal(update(), AuthReason.NOT_TEAM_MEMBER);
  });

  it("rejects if the player is not found", async () => {
    mockPlayerRepository.findById.mockResolvedValue(null);

    await expect(update()).rejects.toBeInstanceOf(NotFoundError);
  });
});
