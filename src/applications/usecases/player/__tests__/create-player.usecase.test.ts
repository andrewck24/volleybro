import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ICreatePlayerUseCase } from '../create-player.usecase.interface';
import { CreatePlayerUseCase } from '../create-player.usecase';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import { PlayerRole } from '@/entities/player';

describe('CreatePlayerUseCase', () => {
  let useCase: ICreatePlayerUseCase;
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

    useCase = new CreatePlayerUseCase(mockPlayerRepository, mockAuthService);
  });

  describe('execute', () => {
    it('should create a pure player without email', async () => {
      const teamId = 'team_123';
      const userId = 'user_456';
      const input = {
        name: '陳球員',
        number: 5,
        position: 'MB' as const,
      };

      const createdPlayer = {
        _id: 'player_new_001',
        ...input,
        teamId,
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.create.mockResolvedValue(createdPlayer);

      const result = await useCase.execute(teamId, input, userId);

      expect(mockAuthService.verifyIsTeamAdmin).toHaveBeenCalledWith(
        teamId,
        userId
      );
      expect(mockPlayerRepository.create).toHaveBeenCalledWith({
        name: input.name,
        number: input.number,
        position: input.position,
        teamId,
        role: PlayerRole.MEMBER,
      });
      expect(result).toEqual(createdPlayer);
    });

    it('should create an invited player with email', async () => {
      const teamId = 'team_123';
      const userId = 'user_456';
      const input = {
        name: '王小明',
        email: 'wang@example.com',
        role: PlayerRole.ADMIN,
      };

      const createdPlayer = {
        _id: 'player_invited_001',
        name: input.name,
        email: input.email,
        role: input.role,
        teamId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
      mockPlayerRepository.create.mockResolvedValue(createdPlayer);

      const result = await useCase.execute(teamId, input, userId);

      expect(mockAuthService.verifyIsTeamAdmin).toHaveBeenCalledWith(
        teamId,
        userId
      );
      expect(mockPlayerRepository.findInvitedByTeamIdAndEmail).toHaveBeenCalledWith(
        teamId,
        input.email
      );
      expect(mockPlayerRepository.create).toHaveBeenCalledWith({
        name: input.name,
        email: input.email,
        role: input.role || PlayerRole.MEMBER,
        teamId,
      });
      expect(result).toEqual(createdPlayer);
    });

    it('should reject if user is not admin', async () => {
      const teamId = 'team_123';
      const userId = 'user_456';
      const input = {
        name: 'Test Player',
      };

      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error('User not authorized')
      );

      await expect(useCase.execute(teamId, input, userId)).rejects.toThrow(
        'User not authorized'
      );
    });

    it('should reject if email already invited in team', async () => {
      const teamId = 'team_123';
      const userId = 'user_456';
      const input = {
        name: 'Test Player',
        email: 'test@example.com',
      };

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue({
        _id: 'player_123',
        name: 'Test',
        teamId,
        email: input.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(useCase.execute(teamId, input, userId)).rejects.toThrow(
        'Email already invited in this team'
      );
    });

    it('should use default role MEMBER if not specified', async () => {
      const teamId = 'team_123';
      const userId = 'user_456';
      const input = {
        name: 'Test Player',
      };

      const createdPlayer = {
        _id: 'player_new_002',
        name: input.name,
        teamId,
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.create.mockResolvedValue(createdPlayer);

      await useCase.execute(teamId, input, userId);

      expect(mockPlayerRepository.create).toHaveBeenCalledWith({
        name: input.name,
        teamId,
        role: PlayerRole.MEMBER,
      });
    });
  });
});
