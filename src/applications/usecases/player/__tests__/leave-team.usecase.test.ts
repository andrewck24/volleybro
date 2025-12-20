import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ILeaveTeamUseCase } from '../leave-team.usecase.interface';
import { LeaveTeamUseCase } from '../leave-team.usecase';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';

describe('LeaveTeamUseCase', () => {
  let useCase: ILeaveTeamUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;

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

    useCase = new LeaveTeamUseCase(mockPlayerRepository);
  });

  describe('execute', () => {
    it('should allow user to leave team', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const player = {
        _id: playerId,
        name: 'Test Player',
        teamId: 'team_789',
        userId,
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(player);
      mockPlayerRepository.update.mockResolvedValue({
        ...player,
        userId: undefined,
      });

      const result = await useCase.execute(playerId, userId);

      expect(mockPlayerRepository.findById).toHaveBeenCalledWith(playerId);
      expect(mockPlayerRepository.update).toHaveBeenCalledWith(playerId, {
        userId: undefined,
      });
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

    it('should reject if user does not own the player record', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const differentUserId = 'user_999';
      const player = {
        _id: playerId,
        name: 'Test Player',
        teamId: 'team_789',
        userId: differentUserId,
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(player);

      await expect(useCase.execute(playerId, userId)).rejects.toThrow(
        'User cannot leave this player record'
      );
    });

    it('should reject if update fails', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const player = {
        _id: playerId,
        name: 'Test Player',
        teamId: 'team_789',
        userId,
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(player);
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(useCase.execute(playerId, userId)).rejects.toThrow(
        'Failed to leave team'
      );
    });
  });
});
