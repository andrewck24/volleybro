import { createMockPlayerRepository, createPlayer } from "@/__tests__/helpers";
import type { ITransferOwnershipUseCase } from "@/applications/usecases/player/transfer-ownership.usecase";
import { TransferOwnershipUseCase } from "@/applications/usecases/player/transfer-ownership.usecase";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  UnexpectedError,
} from "@/entities/errors/app-error";
import { PlayerRole } from "@/entities/player";
import { beforeEach, describe, expect, it } from "@jest/globals";

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
      mockPlayerRepository.update
        .mockResolvedValueOnce({ ...newOwner, role: PlayerRole.OWNER })
        .mockResolvedValueOnce({ ...currentOwner, role: PlayerRole.ADMIN });

      const result = await useCase.execute({ teamId, newOwnerId, userId });

      expect(result.role).toBe(PlayerRole.OWNER);
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

    it("should reject if new owner is not a joined member", async () => {
      const purePlayer = createPlayer({ ...newOwner, userId: undefined });
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(purePlayer);

      await expect(
        useCase.execute({ teamId, newOwnerId, userId }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should reject if update fails", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(newOwner);
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(
        useCase.execute({ teamId, newOwnerId, userId }),
      ).rejects.toBeInstanceOf(UnexpectedError);
    });
  });
});
