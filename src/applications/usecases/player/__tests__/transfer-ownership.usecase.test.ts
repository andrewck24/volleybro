import {
  createInvitedPlayer,
  createPlayer,
  createUnlinkedPlayer,
} from "@test/support/fixtures/entities";
import { createMockPlayerRepository } from "@test/support/doubles/repositories";
import type { ITransferOwnershipUseCase } from "@/applications/usecases/player/transfer-ownership.usecase";
import { TransferOwnershipUseCase } from "@/applications/usecases/player/transfer-ownership.usecase";
import {
  AuthorizationError,
  CommonReason,
  ConflictError,
  NotFoundError,
  PlayerReason,
  UnexpectedError,
} from "@/entities/errors";
import { PlayerRole } from "@/entities/player";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

describe("TransferOwnershipUseCase", () => {
  let useCase: ITransferOwnershipUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;

  const teamId = "team_123";
  const userId = "user_456";
  const newOwnerId = "player_002";

  const currentOwner = createPlayer({
    id: "player_001",
    name: "Current Owner",
    teamId,
    userId,
    role: PlayerRole.OWNER,
  });

  const newOwner = createPlayer({
    id: newOwnerId,
    name: "New Owner",
    teamId,
    userId: "user_789",
    role: PlayerRole.ADMIN,
  });

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    useCase = new TransferOwnershipUseCase(mockPlayerRepository);
  });

  describe("execute", () => {
    it("should transfer ownership and demote current owner to ADMIN", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(newOwner);
      mockPlayerRepository.updateRoleIf
        .mockResolvedValueOnce({ ...currentOwner, role: PlayerRole.ADMIN })
        .mockResolvedValueOnce({ ...newOwner, role: PlayerRole.OWNER });

      const result = await useCase.execute({ teamId, newOwnerId, userId });

      expect(result).toMatchObject({ role: PlayerRole.OWNER });
      expect(mockPlayerRepository.updateRoleIf).toHaveBeenCalledWith(
        currentOwner.id,
        PlayerRole.OWNER,
        PlayerRole.ADMIN,
      );
      expect(mockPlayerRepository.updateRoleIf).toHaveBeenCalledWith(
        newOwnerId,
        PlayerRole.ADMIN,
        PlayerRole.OWNER,
      );
    });

    it("should reject if current owner not found in team", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);

      await expect(
        useCase.execute({ teamId, newOwnerId, userId }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject if user does not have OWNER role", async () => {
      const adminPlayer = createPlayer({
        ...currentOwner,
        role: PlayerRole.ADMIN,
      });
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(adminPlayer);

      await expect(
        useCase.execute({ teamId, newOwnerId, userId }),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("should reject if new owner player not found", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ teamId, newOwnerId, userId }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject if new owner is not in same team", async () => {
      const otherTeamPlayer = createPlayer({ ...newOwner, teamId: "team_999" });
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(otherTeamPlayer);

      await expect(
        useCase.execute({ teamId, newOwnerId, userId }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject an unlinked player as the target", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(
        createUnlinkedPlayer({ id: newOwnerId, teamId }),
      );

      await expect(
        useCase.execute({ teamId, newOwnerId, userId }),
      ).rejects.toMatchObject({ reason: PlayerReason.TARGET_NOT_MEMBER });
    });

    it("should reject an invitee as the target", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(
        createInvitedPlayer({
          id: newOwnerId,
          teamId,
          userId: "user_789",
          role: PlayerRole.ADMIN,
        }),
      );

      const attempt = useCase.execute({ teamId, newOwnerId, userId });

      await expect(attempt).rejects.toBeInstanceOf(ConflictError);
      await expect(attempt).rejects.toMatchObject({
        reason: PlayerReason.TARGET_NOT_MEMBER,
      });
    });

    it("should reject an invitee as the current owner", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        createInvitedPlayer({
          id: "player_001",
          teamId,
          userId,
          role: PlayerRole.OWNER,
        }),
      );

      const attempt = useCase.execute({ teamId, newOwnerId, userId });

      await expect(attempt).rejects.toBeInstanceOf(AuthorizationError);
      await expect(attempt).rejects.toMatchObject({
        reason: PlayerReason.NOT_TEAM_OWNER,
      });
    });

    it("should reject a transfer to the current owner's own player", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(currentOwner);

      const attempt = useCase.execute({
        teamId,
        newOwnerId: currentOwner.id,
        userId,
      });

      await expect(attempt).rejects.toBeInstanceOf(ConflictError);
      await expect(attempt).rejects.toMatchObject({
        reason: PlayerReason.TARGET_ALREADY_OWNER,
      });
      // No write at all, so the team keeps the one owner it had.
      expect(mockPlayerRepository.updateRoleIf).not.toHaveBeenCalled();
    });

    describe("when the second write goes wrong", () => {
      const demoted = { ...currentOwner, role: PlayerRole.ADMIN };
      const restore = [
        currentOwner.id,
        PlayerRole.ADMIN,
        PlayerRole.OWNER,
      ] as const;

      beforeEach(() => {
        mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
          currentOwner,
        );
        mockPlayerRepository.findById.mockResolvedValue(newOwner);
      });

      it("should restore the current owner and rethrow the promotion error", async () => {
        const failure = new ConflictError(
          CommonReason.DUPLICATE_RESOURCE,
          "duplicate owner",
        );
        mockPlayerRepository.updateRoleIf
          .mockResolvedValueOnce(demoted)
          .mockRejectedValueOnce(failure)
          .mockResolvedValueOnce(currentOwner);

        await expect(
          useCase.execute({ teamId, newOwnerId, userId }),
        ).rejects.toBe(failure);

        expect(mockPlayerRepository.updateRoleIf).toHaveBeenLastCalledWith(
          ...restore,
        );
      });

      it("should restore the current owner when the target left the team meanwhile", async () => {
        mockPlayerRepository.updateRoleIf
          .mockResolvedValueOnce(demoted)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(currentOwner);

        await expect(
          useCase.execute({ teamId, newOwnerId, userId }),
        ).rejects.toMatchObject({ reason: PlayerReason.TARGET_NOT_MEMBER });

        expect(mockPlayerRepository.updateRoleIf).toHaveBeenLastCalledWith(
          ...restore,
        );
      });

      describe("and the restore fails too", () => {
        let consoleError: jest.SpiedFunction<typeof console.error>;

        beforeEach(() => {
          consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);
        });

        afterEach(() => {
          consoleError.mockRestore();
        });

        it("should still surface the promotion error", async () => {
          const failure = new UnexpectedError(
            CommonReason.UNHANDLED_ERROR,
            "promotion failed",
          );
          mockPlayerRepository.updateRoleIf
            .mockResolvedValueOnce(demoted)
            .mockRejectedValueOnce(failure)
            .mockRejectedValueOnce(new Error("restore failed"));

          await expect(
            useCase.execute({ teamId, newOwnerId, userId }),
          ).rejects.toBe(failure);
        });
      });
    });

    it("should refuse when another transfer already demoted the owner", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(newOwner);
      mockPlayerRepository.updateRoleIf.mockResolvedValue(null);

      const attempt = useCase.execute({ teamId, newOwnerId, userId });

      await expect(attempt).rejects.toBeInstanceOf(AuthorizationError);
      await expect(attempt).rejects.toMatchObject({
        reason: PlayerReason.NOT_TEAM_OWNER,
      });
      expect(mockPlayerRepository.updateRoleIf).toHaveBeenCalledTimes(1);
    });
  });
});
