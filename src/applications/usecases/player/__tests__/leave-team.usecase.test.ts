import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { ILeaveTeamUseCase } from "../leave-team.usecase.interface";
import { LeaveTeamUseCase } from "../leave-team.usecase";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import { PlayerRole, PlayerStatus } from "@/entities/player";

describe("LeaveTeamUseCase", () => {
  let useCase: ILeaveTeamUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;
  let mockTeamRepository: jest.Mocked<ITeamRepository>;
  let mockProfileRepository: jest.Mocked<IProfileRepository>;

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
      linkUserToInvitations: jest.fn(),
    } as any;

    mockTeamRepository = {
      removePlayerFromLineups: jest.fn(),
    } as any;

    mockProfileRepository = {
      findByUserId: jest.fn(),
      updateActiveTeamId: jest.fn(),
    } as any;

    useCase = new LeaveTeamUseCase(
      mockPlayerRepository,
      mockTeamRepository,
      mockProfileRepository,
    );
  });

  describe("execute", () => {
    it("should set status to NONE and clear userId when leaving", async () => {
      const playerId = "player_123";
      const userId = "user_456";
      const player = {
        _id: playerId,
        name: "Test Player",
        teamId: "team_789",
        status: PlayerStatus.JOINED,
        userId,
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(player);
      mockPlayerRepository.update.mockResolvedValue({
        ...player,
        status: PlayerStatus.NONE,
        userId: undefined,
      });
      mockTeamRepository.removePlayerFromLineups.mockResolvedValue();
      mockProfileRepository.findByUserId.mockResolvedValue({
        _id: "profile_1",
        userId,
        activeTeamId: "team_789",
      } as any);
      mockProfileRepository.updateActiveTeamId.mockResolvedValue(null);

      const result = await useCase.execute(playerId, userId);

      expect(mockPlayerRepository.findById).toHaveBeenCalledWith(playerId);
      expect(mockPlayerRepository.update).toHaveBeenCalledWith(playerId, {
        status: PlayerStatus.NONE,
        userId: undefined,
      });
      expect(mockTeamRepository.removePlayerFromLineups).toHaveBeenCalledWith(
        "team_789",
        playerId,
      );
      expect(mockProfileRepository.updateActiveTeamId).toHaveBeenCalledWith(
        userId,
        null,
      );
      expect(result).toEqual({ success: true });
    });

    it("should not clear activeTeamId if it points to a different team", async () => {
      const playerId = "player_123";
      const userId = "user_456";
      const player = {
        _id: playerId,
        name: "Test Player",
        teamId: "team_789",
        status: PlayerStatus.JOINED,
        userId,
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(player);
      mockPlayerRepository.update.mockResolvedValue({
        ...player,
        status: PlayerStatus.NONE,
        userId: undefined,
      });
      mockTeamRepository.removePlayerFromLineups.mockResolvedValue();
      mockProfileRepository.findByUserId.mockResolvedValue({
        _id: "profile_1",
        userId,
        activeTeamId: "other_team",
      } as any);

      await useCase.execute(playerId, userId);

      expect(mockProfileRepository.updateActiveTeamId).not.toHaveBeenCalled();
    });

    it("should reject if player not found", async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute("player_999", "user_456")).rejects.toThrow(
        "Player not found",
      );
    });

    it("should reject if user does not own the player record", async () => {
      const player = {
        _id: "player_123",
        name: "Test Player",
        teamId: "team_789",
        status: PlayerStatus.JOINED,
        userId: "user_999",
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(player);

      await expect(useCase.execute("player_123", "user_456")).rejects.toThrow(
        "User cannot leave this player record",
      );
    });

    it("should reject if owner tries to leave the team", async () => {
      const owner = {
        _id: "player_123",
        name: "Team Owner",
        teamId: "team_789",
        status: PlayerStatus.JOINED,
        userId: "user_456",
        role: PlayerRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(owner);

      await expect(useCase.execute("player_123", "user_456")).rejects.toThrow(
        "Owner cannot leave the team",
      );
    });

    it("should reject if update fails", async () => {
      const player = {
        _id: "player_123",
        name: "Test Player",
        teamId: "team_789",
        status: PlayerStatus.JOINED,
        userId: "user_456",
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(player);
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(useCase.execute("player_123", "user_456")).rejects.toThrow(
        "Failed to leave team",
      );
    });
  });
});
