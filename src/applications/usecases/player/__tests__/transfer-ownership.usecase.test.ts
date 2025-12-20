import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ITransferOwnershipUseCase } from '../transfer-ownership.usecase.interface';
import { TransferOwnershipUseCase } from '../transfer-ownership.usecase';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import { PlayerRole } from '@/entities/player';

describe('TransferOwnershipUseCase', () => {
  let useCase: ITransferOwnershipUseCase;
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

    useCase = new TransferOwnershipUseCase(
      mockPlayerRepository,
      mockAuthService
    );
  });

  describe('execute', () => {
    it('should transfer ownership to new owner', async () => {
      const teamId = 'team_123';
      const currentOwnerId = 'player_owner_001';
      const newOwnerId = 'player_owner_002';
      const userId = 'user_456';

      const currentOwner = {
        _id: currentOwnerId,
        name: 'Current Owner',
        teamId,
        userId,
        role: PlayerRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newOwner = {
        _id: newOwnerId,
        name: 'New Owner',
        teamId,
        userId: 'user_789',
        role: PlayerRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById
        .mockResolvedValueOnce(currentOwner)
        .mockResolvedValueOnce(newOwner);
      mockPlayerRepository.update.mockResolvedValue({
        ...newOwner,
        role: PlayerRole.OWNER,
      });

      const result = await useCase.execute(
        currentOwnerId,
        newOwnerId,
        userId
      );

      expect(mockPlayerRepository.findById).toHaveBeenNthCalledWith(
        1,
        currentOwnerId
      );
      expect(mockPlayerRepository.findById).toHaveBeenNthCalledWith(
        2,
        newOwnerId
      );
      expect(mockPlayerRepository.update).toHaveBeenCalledWith(newOwnerId, {
        role: PlayerRole.OWNER,
      });
      expect(result.role).toBe(PlayerRole.OWNER);
    });

    it('should reject if current owner not found', async () => {
      const currentOwnerId = 'player_999';
      const newOwnerId = 'player_002';
      const userId = 'user_456';

      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(currentOwnerId, newOwnerId, userId)
      ).rejects.toThrow('Player not found');
    });

    it('should reject if new owner not found', async () => {
      const teamId = 'team_123';
      const currentOwnerId = 'player_owner_001';
      const newOwnerId = 'player_999';
      const userId = 'user_456';

      const currentOwner = {
        _id: currentOwnerId,
        name: 'Current Owner',
        teamId,
        userId,
        role: PlayerRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById
        .mockResolvedValueOnce(currentOwner)
        .mockResolvedValueOnce(null);

      await expect(
        useCase.execute(currentOwnerId, newOwnerId, userId)
      ).rejects.toThrow('Player not found');
    });

    it('should reject if owners are not in same team', async () => {
      const currentOwnerId = 'player_owner_001';
      const newOwnerId = 'player_owner_002';
      const userId = 'user_456';

      const currentOwner = {
        _id: currentOwnerId,
        name: 'Current Owner',
        teamId: 'team_123',
        userId,
        role: PlayerRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newOwner = {
        _id: newOwnerId,
        name: 'New Owner',
        teamId: 'team_999',
        userId: 'user_789',
        role: PlayerRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById
        .mockResolvedValueOnce(currentOwner)
        .mockResolvedValueOnce(newOwner);

      await expect(
        useCase.execute(currentOwnerId, newOwnerId, userId)
      ).rejects.toThrow('Players must be in same team');
    });

    it('should reject if user is not the owner', async () => {
      const teamId = 'team_123';
      const currentOwnerId = 'player_owner_001';
      const newOwnerId = 'player_owner_002';
      const userId = 'user_999';

      const currentOwner = {
        _id: currentOwnerId,
        name: 'Current Owner',
        teamId,
        userId: 'user_456',
        role: PlayerRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newOwner = {
        _id: newOwnerId,
        name: 'New Owner',
        teamId,
        userId: 'user_789',
        role: PlayerRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById
        .mockResolvedValueOnce(currentOwner)
        .mockResolvedValueOnce(newOwner);

      await expect(
        useCase.execute(currentOwnerId, newOwnerId, userId)
      ).rejects.toThrow('Only current owner can transfer ownership');
    });

    it('should reject if current owner does not have OWNER role', async () => {
      const teamId = 'team_123';
      const currentOwnerId = 'player_owner_001';
      const newOwnerId = 'player_owner_002';
      const userId = 'user_456';

      const currentOwner = {
        _id: currentOwnerId,
        name: 'Current Owner',
        teamId,
        userId,
        role: PlayerRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newOwner = {
        _id: newOwnerId,
        name: 'New Owner',
        teamId,
        userId: 'user_789',
        role: PlayerRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById
        .mockResolvedValueOnce(currentOwner)
        .mockResolvedValueOnce(newOwner);

      await expect(
        useCase.execute(currentOwnerId, newOwnerId, userId)
      ).rejects.toThrow('User must be OWNER to transfer ownership');
    });

    it('should reject if update fails', async () => {
      const teamId = 'team_123';
      const currentOwnerId = 'player_owner_001';
      const newOwnerId = 'player_owner_002';
      const userId = 'user_456';

      const currentOwner = {
        _id: currentOwnerId,
        name: 'Current Owner',
        teamId,
        userId,
        role: PlayerRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newOwner = {
        _id: newOwnerId,
        name: 'New Owner',
        teamId,
        userId: 'user_789',
        role: PlayerRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlayerRepository.findById
        .mockResolvedValueOnce(currentOwner)
        .mockResolvedValueOnce(newOwner);
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(
        useCase.execute(currentOwnerId, newOwnerId, userId)
      ).rejects.toThrow('Failed to update new owner');
    });
  });
});
