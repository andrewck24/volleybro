import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { PlayerRole } from "@/entities/player";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TransferOwnershipUseCase } from "../transfer-ownership.usecase";
import type { ITransferOwnershipUseCase } from "../transfer-ownership.usecase.interface";
import { NotFoundError, AuthorizationError, ConflictError, UnexpectedError } from "@/entities/errors/app-error";

describe("TransferOwnershipUseCase", () => {
  let useCase: ITransferOwnershipUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;

  const teamId = "team_123";
  const userId = "user_456";
  const newOwnerId = "player_002";

  const currentOwner = {
    _id: "player_001",
    name: "Current Owner",
    teamId,
    userId,
    role: PlayerRole.OWNER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const newOwner = {
    _id: newOwnerId,
    name: "New Owner",
    teamId,
    userId: "user_789",
    role: PlayerRole.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPlayerRepository = {
      findById: jest.fn(),
      findByTeamId: jest.fn(),
      findByUserId: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findInvitedByTeamIdAndEmail: jest.fn(),
      findByTeamIdAndUserId: jest.fn(),
      countByTeamId: jest.fn(),
      findTeamOwner: jest.fn(),
      findAdminsByTeamId: jest.fn(),
      existsInvitation: jest.fn(),
    } as jest.Mocked<IPlayerRepository>;

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

      const result = await useCase.execute(teamId, newOwnerId, userId);

      expect(mockPlayerRepository.findByTeamIdAndUserId).toHaveBeenCalledWith(
        teamId,
        userId,
      );
      expect(mockPlayerRepository.findById).toHaveBeenCalledWith(newOwnerId);
      expect(mockPlayerRepository.update).toHaveBeenNthCalledWith(
        1,
        newOwnerId,
        { role: PlayerRole.OWNER },
      );
      expect(mockPlayerRepository.update).toHaveBeenNthCalledWith(
        2,
        currentOwner._id,
        { role: PlayerRole.ADMIN },
      );
      expect(result.role).toBe(PlayerRole.OWNER);
    });

    it("should reject if current owner not found in team", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);

      await expect(useCase.execute(teamId, newOwnerId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject if user does not have OWNER role", async () => {
      const adminPlayer = { ...currentOwner, role: PlayerRole.ADMIN };
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(adminPlayer);

      await expect(useCase.execute(teamId, newOwnerId, userId)).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("should reject if new owner player not found", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(teamId, newOwnerId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject if new owner is not in same team", async () => {
      const otherTeamPlayer = { ...newOwner, teamId: "team_999" };
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(otherTeamPlayer);

      await expect(useCase.execute(teamId, newOwnerId, userId)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject if new owner is not a joined member", async () => {
      const purePlayer = { ...newOwner, userId: undefined };
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(purePlayer);

      await expect(useCase.execute(teamId, newOwnerId, userId)).rejects.toBeInstanceOf(ConflictError);
    });

    it("should reject if update fails", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        currentOwner,
      );
      mockPlayerRepository.findById.mockResolvedValue(newOwner);
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(useCase.execute(teamId, newOwnerId, userId)).rejects.toBeInstanceOf(UnexpectedError);
    });
  });
});
