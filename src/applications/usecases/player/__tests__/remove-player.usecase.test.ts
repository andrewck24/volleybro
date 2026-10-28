import {
  createInvitedPlayer,
  createPlayer,
  createTeam,
  createUnlinkedPlayer,
} from "@test/support/fixtures/entities";
import {
  createMockPlayerRepository,
  createMockTeamRepository,
} from "@test/support/doubles/repositories";
import type { IRemovePlayerUseCase } from "@/applications/usecases/player/remove-player.usecase";
import { RemovePlayerUseCase } from "@/applications/usecases/player/remove-player.usecase";
import {
  AuthorizationError,
  AuthReason,
  NotFoundError,
  PlayerReason,
  UnexpectedError,
} from "@/entities/errors";
import { PlayerRole } from "@/entities/player";
import { beforeEach, describe, expect, it } from "@jest/globals";

describe("RemovePlayerUseCase", () => {
  let useCase: IRemovePlayerUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockTeamRepository: ReturnType<typeof createMockTeamRepository>;

  const caller = "user-actor";

  const actor = (role: PlayerRole) =>
    createPlayer({ id: "actor", userId: caller, role });

  const targets = {
    owner: createPlayer({
      id: "target",
      userId: "user-target",
      role: PlayerRole.ADMIN,
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
    invitee: createInvitedPlayer({ id: "target", userId: "user-target" }),
    unlinked: createUnlinkedPlayer({ id: "target" }),
  };

  const remove = () => useCase.execute({ playerId: "target", userId: caller });

  const expectRefusal = async (attempt: Promise<unknown>, reason: string) => {
    await expect(attempt).rejects.toBeInstanceOf(AuthorizationError);
    await expect(attempt).rejects.toMatchObject({ reason });
    expect(mockPlayerRepository.delete).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockTeamRepository = createMockTeamRepository();
    mockTeamRepository.findById.mockResolvedValue(
      createTeam({ ownerPlayerId: "owner" }),
    );
    useCase = new RemovePlayerUseCase(mockPlayerRepository, mockTeamRepository);
    mockPlayerRepository.delete.mockResolvedValue(true);
    mockTeamRepository.removePlayerFromLineups.mockResolvedValue();
  });

  describe("targets an admin may delete", () => {
    beforeEach(() => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        actor(PlayerRole.ADMIN),
      );
    });

    it.each(["admin", "member", "invitee", "unlinked"] as const)(
      "deletes %s",
      async (kind) => {
        mockPlayerRepository.findById.mockResolvedValue(targets[kind]);

        expect(await remove()).toEqual({ success: true });
        expect(mockPlayerRepository.delete).toHaveBeenCalledWith("target");
        expect(mockTeamRepository.removePlayerFromLineups).toHaveBeenCalledWith(
          "team-1",
          "target",
        );
      },
    );

    it("has cleared the lineups when the delete fails, so the removal can be retried", async () => {
      mockPlayerRepository.findById.mockResolvedValue(targets.member);
      mockPlayerRepository.delete.mockRejectedValue(new Error("db down"));

      await expect(remove()).rejects.toThrow("db down");
      expect(mockTeamRepository.removePlayerFromLineups).toHaveBeenCalledWith(
        "team-1",
        "target",
      );
    });

    it("refuses the owner, who can only hand ownership over", async () => {
      mockTeamRepository.findById.mockResolvedValue(
        createTeam({ ownerPlayerId: targets.owner.id }),
      );
      mockPlayerRepository.findById.mockResolvedValue(targets.owner);

      await expectRefusal(remove(), PlayerReason.TARGET_IS_OWNER);
    });

    it("refuses the caller's own player", async () => {
      const self = actor(PlayerRole.ADMIN);
      mockPlayerRepository.findById.mockResolvedValue(self);

      await expectRefusal(
        useCase.execute({ playerId: self.id, userId: caller }),
        PlayerReason.TARGET_IS_SELF,
      );
    });
  });

  it("refuses a caller who is a member", async () => {
    mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
      actor(PlayerRole.MEMBER),
    );
    mockPlayerRepository.findById.mockResolvedValue(targets.member);

    await expectRefusal(remove(), AuthReason.INSUFFICIENT_ROLE);
  });

  it("refuses a caller with no player on the team", async () => {
    mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);
    mockPlayerRepository.findById.mockResolvedValue(targets.member);

    await expectRefusal(remove(), AuthReason.NOT_TEAM_MEMBER);
  });

  it("rejects if the player is not found", async () => {
    mockPlayerRepository.findById.mockResolvedValue(null);

    await expect(remove()).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects if the delete fails", async () => {
    mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
      actor(PlayerRole.ADMIN),
    );
    mockPlayerRepository.findById.mockResolvedValue(targets.member);
    mockPlayerRepository.delete.mockResolvedValue(false);

    await expect(remove()).rejects.toBeInstanceOf(UnexpectedError);
  });
});
