import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ICancelInvitationUseCase } from '../cancel-invitation.usecase.interface';
import { CancelInvitationUseCase } from '../cancel-invitation.usecase';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';

describe('CancelInvitationUseCase', () => {
  let useCase: ICancelInvitationUseCase;
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

    useCase = new CancelInvitationUseCase(mockPlayerRepository, mockAuthService);
  });

  describe('execute', () => {
    it('should cancel invitation by removing email', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const teamId = 'team_789';
      const email = 'invited@example.com';

      const invitedPlayer = {
        _id: playerId,
        name: 'Invited Player',
        teamId,
        email,
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const cancelledPlayer = {
        ...invitedPlayer,
        email: undefined,
      };

      mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(cancelledPlayer);

      const result = await useCase.execute(playerId, userId);

      expect(mockPlayerRepository.findById).toHaveBeenCalledWith(playerId);
      expect(mockAuthService.verifyIsTeamAdmin).toHaveBeenCalledWith(
        teamId,
        userId
      );
      expect(mockPlayerRepository.update).toHaveBeenCalledWith(playerId, {
        email: undefined,
      });
      expect(result.email).toBeUndefined();
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
      const email = 'invited@example.com';

      const invitedPlayer = {
        _id: playerId,
        name: 'Invited Player',
        teamId,
        email,
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error('User not authorized')
      );

      await expect(useCase.execute(playerId, userId)).rejects.toThrow(
        'User not authorized'
      );
    });

    it('should reject if player is not an invited member', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const teamId = 'team_789';

      const purePlayer = {
        _id: playerId,
        name: 'Pure Player',
        teamId,
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(purePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();

      await expect(useCase.execute(playerId, userId)).rejects.toThrow(
        'Player is not an invited member'
      );
    });

    it('should reject if update fails', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const teamId = 'team_789';
      const email = 'invited@example.com';

      const invitedPlayer = {
        _id: playerId,
        name: 'Invited Player',
        teamId,
        email,
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(useCase.execute(playerId, userId)).rejects.toThrow(
        'Failed to cancel invitation'
      );
    });
  });
});
