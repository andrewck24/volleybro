import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { PlayerRole } from "@/entities/player";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CreateInvitationUseCase } from "../create-invitation.usecase";
import type { ICreateInvitationUseCase } from "../create-invitation.usecase.interface";

describe("CreateInvitationUseCase", () => {
  let useCase: ICreateInvitationUseCase;
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

    useCase = new CreateInvitationUseCase(
      mockPlayerRepository,
      mockAuthService,
    );
  });

  describe("execute", () => {
    const playerId = "player_123";
    const userId = "user_456";
    const teamId = "team_789";
    const email = "newmember@example.com";
    const role = PlayerRole.MEMBER;

    const purePlayer = {
      _id: playerId,
      name: "Pure Player",
      teamId,
      role: PlayerRole.MEMBER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should invite a PURE_PLAYER by adding email", async () => {
      const invitedPlayer = {
        ...purePlayer,
        email,
        role,
      };

      mockPlayerRepository.findById.mockResolvedValue(purePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(invitedPlayer);

      const result = await useCase.execute(playerId, email, role, userId);

      expect(mockPlayerRepository.findById).toHaveBeenCalledWith(playerId);
      expect(mockAuthService.verifyIsTeamAdmin).toHaveBeenCalledWith(
        teamId,
        userId,
      );
      expect(mockPlayerRepository.update).toHaveBeenCalledWith(playerId, {
        email,
        role,
      });
      expect(result.email).toBe(email);
      expect(result.role).toBe(role);
    });

    it("should invite with ADMIN role", async () => {
      const adminRole = PlayerRole.ADMIN;
      const invitedPlayer = {
        ...purePlayer,
        email,
        role: adminRole,
      };

      mockPlayerRepository.findById.mockResolvedValue(purePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(invitedPlayer);

      const result = await useCase.execute(playerId, email, adminRole, userId);

      expect(mockPlayerRepository.update).toHaveBeenCalledWith(playerId, {
        email,
        role: adminRole,
      });
      expect(result.role).toBe(adminRole);
    });

    it("should reject if player not found", async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(playerId, email, role, userId),
      ).rejects.toThrow("Player not found");
    });

    it("should reject if player already has email (INVITED status)", async () => {
      const invitedPlayer = {
        ...purePlayer,
        email: "existing@example.com",
      };

      mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);

      await expect(
        useCase.execute(playerId, email, role, userId),
      ).rejects.toThrow("Player already has an invitation");
    });

    it("should reject if player already has userId (JOINED status)", async () => {
      const joinedPlayer = {
        ...purePlayer,
        userId: "some_user_id",
      };

      mockPlayerRepository.findById.mockResolvedValue(joinedPlayer);

      await expect(
        useCase.execute(playerId, email, role, userId),
      ).rejects.toThrow("Player is already a joined member");
    });

    it("should reject if user is not team admin", async () => {
      mockPlayerRepository.findById.mockResolvedValue(purePlayer);
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error("User is not admin of this team"),
      );

      await expect(
        useCase.execute(playerId, email, role, userId),
      ).rejects.toThrow("User is not admin of this team");
    });

    it("should reject if update fails", async () => {
      mockPlayerRepository.findById.mockResolvedValue(purePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(
        useCase.execute(playerId, email, role, userId),
      ).rejects.toThrow("Failed to create invitation");
    });
  });
});
