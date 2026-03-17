import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ICancelInvitationUseCase } from '../cancel-invitation.usecase.interface';
import { CancelInvitationUseCase } from '../cancel-invitation.usecase';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import { PlayerStatus } from '@/entities/player';

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
      linkUserToInvitations: jest.fn(),
    } as any;

    mockAuthService = {
      verifyIsTeamAdmin: jest.fn(),
    } as any;

    useCase = new CancelInvitationUseCase(mockPlayerRepository, mockAuthService);
  });

  describe('execute', () => {
    it('should cancel invitation by setting status to NONE and clearing email/userId', async () => {
      const playerId = 'player_123';
      const userId = 'user_456';
      const teamId = 'team_789';

      const invitedPlayer = {
        _id: playerId,
        name: 'Invited Player',
        teamId,
        status: PlayerStatus.INVITED,
        email: 'invited@example.com',
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const cancelledPlayer = {
        ...invitedPlayer,
        status: PlayerStatus.NONE,
        email: undefined,
        userId: undefined,
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
        status: PlayerStatus.NONE,
        email: undefined,
        userId: undefined,
      });
      expect(result.email).toBeUndefined();
    });

    it('should reject if player not found', async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('player_999', 'user_456')).rejects.toThrow(
        'Player not found'
      );
    });

    it('should reject if user is not team admin', async () => {
      const invitedPlayer = {
        _id: 'player_123',
        name: 'Invited Player',
        teamId: 'team_789',
        status: PlayerStatus.INVITED,
        email: 'invited@example.com',
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error('User not authorized')
      );

      await expect(useCase.execute('player_123', 'user_456')).rejects.toThrow(
        'User not authorized'
      );
    });

    it('should reject if player status is not INVITED', async () => {
      const nonePlayer = {
        _id: 'player_123',
        name: 'Pure Player',
        teamId: 'team_789',
        status: PlayerStatus.NONE,
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();

      await expect(useCase.execute('player_123', 'user_456')).rejects.toThrow(
        'Player is not an invited member'
      );
    });

    it('should reject if update fails', async () => {
      const invitedPlayer = {
        _id: 'player_123',
        name: 'Invited Player',
        teamId: 'team_789',
        status: PlayerStatus.INVITED,
        email: 'invited@example.com',
        role: 'MEMBER' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(useCase.execute('player_123', 'user_456')).rejects.toThrow(
        'Failed to cancel invitation'
      );
    });
  });
});
