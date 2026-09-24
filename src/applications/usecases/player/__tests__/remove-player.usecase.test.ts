import {
  createInvitedPlayer,
  createMockPlayerRepository,
  createMockProfileRepository,
  createMockTeamRepository,
  createPlayer,
  createProfile,
  createUnlinkedPlayer,
} from "@/__tests__/helpers";
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
  let mockProfileRepository: ReturnType<typeof createMockProfileRepository>;

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
    mockProfileRepository = createMockProfileRepository();
    useCase = new RemovePlayerUseCase(
      mockPlayerRepository,
      mockTeamRepository,
      mockProfileRepository,
    );
    mockPlayerRepository.delete.mockResolvedValue(true);
    mockTeamRepository.removePlayerFromLineups.mockResolvedValue();
    mockProfileRepository.findByUserId.mockResolvedValue(null);
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

    it("refuses the owner, who can only hand ownership over", async () => {
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

  it("lets the owner delete an admin", async () => {
    mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
      actor(PlayerRole.OWNER),
    );
    mockPlayerRepository.findById.mockResolvedValue(targets.admin);

    expect(await remove()).toEqual({ success: true });
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

  describe("the deleted member's default team", () => {
    beforeEach(() => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        actor(PlayerRole.ADMIN),
      );
      mockPlayerRepository.findById.mockResolvedValue(targets.member);
    });

    it("is cleared when it points at this team", async () => {
      mockProfileRepository.findByUserId.mockResolvedValue(
        createProfile({ userId: "user-target", activeTeamId: "team-1" }),
      );

      await remove();

      expect(mockProfileRepository.updateActiveTeamId).toHaveBeenCalledWith(
        "user-target",
        null,
      );
    });

    it("is left alone when it points at another team", async () => {
      mockProfileRepository.findByUserId.mockResolvedValue(
        createProfile({ userId: "user-target", activeTeamId: "team-2" }),
      );

      await remove();

      expect(mockProfileRepository.updateActiveTeamId).not.toHaveBeenCalled();
    });

    it("is not read for a player who never joined", async () => {
      mockPlayerRepository.findById.mockResolvedValue(targets.invitee);

      await remove();

      expect(mockProfileRepository.findByUserId).not.toHaveBeenCalled();
    });
  });
});
