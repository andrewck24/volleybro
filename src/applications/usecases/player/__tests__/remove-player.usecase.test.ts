import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { IRemovePlayerUseCase } from '../remove-player.usecase.interface';
import { RemovePlayerUseCase } from '../remove-player.usecase';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import type { ITeamRepository } from '@/applications/repositories/team.repository.interface';

describe('RemovePlayerUseCase', () => {
  let useCase: IRemovePlayerUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;
  let mockAuthService: jest.Mocked<IAuthorizationService>;
  let mockTeamRepository: jest.Mocked<ITeamRepository>;

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
    } as any;

    mockAuthService = {
      verifyIsTeamAdmin: jest.fn(),
    } as any;

    mockTeamRepository = {
      removePlayerFromLineups: jest.fn(),
    } as any;

    useCase = new RemovePlayerUseCase(mockPlayerRepository, mockAuthService, mockTeamRepository);
  });

  describe('execute', () => {
    it('should remove player from team', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const teamId = 'team_789';

      const player = {
        _id: playerId,
        name: 'Test Player',
        teamId,
        userId: 'user_different',
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.findById.mockResolvedValue(player);
      mockPlayerRepository.delete.mockResolvedValue(true);
      mockTeamRepository.removePlayerFromLineups.mockResolvedValue();

      const result = await useCase.execute(playerId, userId);

      expect(mockAuthService.verifyIsTeamAdmin).toHaveBeenCalledWith(
        teamId,
        userId
      );
      expect(mockPlayerRepository.findById).toHaveBeenCalledWith(playerId);
      expect(mockPlayerRepository.delete).toHaveBeenCalledWith(playerId);
      expect(mockTeamRepository.removePlayerFromLineups).toHaveBeenCalledWith(
        teamId,
        playerId
      );
      expect(result).toEqual({ success: true });
    });

    it('should reject if player not found', async () => {
      const playerId = 'player_999';
      const userId = 'user_456';

      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(playerId, userId)).rejects.toThrow(
        'Player not found'
      );
    });

    it('should reject if user is not team admin', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const teamId = 'team_789';

      const player = {
        _id: playerId,
        name: 'Test Player',
        teamId,
        userId: 'user_different',
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(player);
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error('User not authorized')
      );

      await expect(useCase.execute(playerId, userId)).rejects.toThrow(
        'User not authorized'
      );
    });

    it('should reject if delete fails', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const teamId = 'team_789';

      const player = {
        _id: playerId,
        name: 'Test Player',
        teamId,
        userId: 'user_different',
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.findById.mockResolvedValue(player);
      mockPlayerRepository.delete.mockResolvedValue(false);

      await expect(useCase.execute(playerId, userId)).rejects.toThrow(
        'Failed to delete player'
      );
    });
  });
});
