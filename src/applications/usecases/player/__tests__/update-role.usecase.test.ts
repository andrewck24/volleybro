import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { IUpdateRoleUseCase } from '../update-role.usecase.interface';
import { UpdateRoleUseCase } from '../update-role.usecase';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import { PlayerRole } from '@/entities/player';

describe('UpdateRoleUseCase', () => {
  let useCase: IUpdateRoleUseCase;
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
      findTeamOwner: jest.fn(),
    } as any;

    mockAuthService = {
      verifyIsTeamAdmin: jest.fn(),
      getPlayerRole: jest.fn(),
    } as any;

    useCase = new UpdateRoleUseCase(mockPlayerRepository, mockAuthService);
  });

  describe('execute', () => {
    it('should update player role to ADMIN', async () => {
      const playerId = 'player_123';
      const newRole = PlayerRole.ADMIN;
      const userId = 'user_456';

      const currentPlayer = {
        _id: playerId,
        name: 'Test Player',
        teamId: 'team_123',
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPlayer = {
        ...currentPlayer,
        role: newRole,
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(currentPlayer as any);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(updatedPlayer as any);

      const result = await useCase.execute(playerId, newRole, userId);

      expect(mockAuthService.verifyIsTeamAdmin).toHaveBeenCalledWith(
        currentPlayer.teamId,
        userId
      );
      expect(mockPlayerRepository.update).toHaveBeenCalledWith(playerId, {
        role: newRole,
      });
      expect(result.role).toBe(newRole);
    });

    it('should allow ADMIN to downgrade own role to MEMBER', async () => {
      const playerId = 'player_123';
      const userId = 'player_123'; // Same user
      const newRole = PlayerRole.MEMBER;

      const currentPlayer = {
        _id: playerId,
        name: 'Test Admin',
        teamId: 'team_123',
        role: PlayerRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPlayer = {
        ...currentPlayer,
        role: newRole,
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(currentPlayer as any);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(updatedPlayer as any);

      const result = await useCase.execute(playerId, newRole, userId);

      expect(result.role).toBe(newRole);
    });

    it('should prevent non-admin from updating roles', async () => {
      const playerId = 'player_123';
      const newRole = PlayerRole.ADMIN;
      const userId = 'user_456';
      const teamId = 'team_123';

      const currentPlayer = {
        _id: playerId,
        name: 'Test Player',
        teamId,
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(currentPlayer as any);
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error('User is not admin')
      );

      await expect(useCase.execute(playerId, newRole, userId)).rejects.toThrow(
        'User is not admin'
      );
    });

    it('should reject if player not found', async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('non_existent', PlayerRole.ADMIN, 'user_456')
      ).rejects.toThrow();
    });
  });
});
