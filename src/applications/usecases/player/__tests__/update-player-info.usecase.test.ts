import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { IUpdatePlayerInfoUseCase } from '../update-player-info.usecase.interface';
import { UpdatePlayerInfoUseCase } from '../update-player-info.usecase';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import { PlayerRole } from '@/entities/player';

describe('UpdatePlayerInfoUseCase', () => {
  let useCase: IUpdatePlayerInfoUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;
  let mockAuthService: jest.Mocked<IAuthorizationService>;

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

    useCase = new UpdatePlayerInfoUseCase(
      mockPlayerRepository,
      mockAuthService
    );
  });

  describe('execute', () => {
    it('should update player name and number', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const updateData = {
        name: '新名字',
        number: 10,
      };

      const currentPlayer = {
        _id: playerId,
        name: 'Old Name',
        number: 5,
        teamId: 'team_123',
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPlayer = {
        ...currentPlayer,
        ...updateData,
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(currentPlayer as any);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(updatedPlayer as any);

      const result = await useCase.execute(playerId, updateData, userId);

      expect(mockAuthService.verifyIsTeamAdmin).toHaveBeenCalledWith(
        currentPlayer.teamId,
        userId
      );
      expect(mockPlayerRepository.update).toHaveBeenCalledWith(playerId, {
        name: updateData.name,
        number: updateData.number,
      });
      expect(result.name).toBe(updateData.name);
      expect(result.number).toBe(updateData.number);
    });

    it('should update player position', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const updateData = {
        position: 'OH' as const,
      };

      const currentPlayer = {
        _id: playerId,
        name: 'Test Player',
        teamId: 'team_123',
        position: 'MB',
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPlayer = {
        ...currentPlayer,
        position: updateData.position,
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(currentPlayer as any);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(updatedPlayer as any);

      const result = await useCase.execute(playerId, updateData, userId);

      expect(result.position).toBe(updateData.position);
    });

    it('should not update email field', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const updateData = {
        name: 'New Name',
      };

      const currentPlayer = {
        _id: playerId,
        name: 'Old Name',
        email: 'test@example.com',
        teamId: 'team_123',
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(currentPlayer as any);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue({
        ...currentPlayer,
        ...updateData,
      } as any);

      await useCase.execute(playerId, updateData, userId);

      // Verify email was NOT in the update call
      const updateCall = mockPlayerRepository.update.mock.calls[0];
      expect(updateCall[1]).not.toHaveProperty('email');
    });

    it('should prevent non-admin from updating', async () => {
      mockPlayerRepository.findById.mockResolvedValue({
        _id: 'player_123',
        teamId: 'team_123',
      } as any);
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error('Not admin')
      );

      await expect(
        useCase.execute('player_123', { name: 'New' }, 'user_456')
      ).rejects.toThrow('Not admin');
    });

    it('should reject if player not found', async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('non_existent', { name: 'New' }, 'user_456')
      ).rejects.toThrow();
    });
  });
});
