import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { Player, PlayerRole } from "@/entities/player";
import { AuthorizationError } from "@/entities/errors/app-error";
import { AuthorizationService } from "@/infrastructure/services/auth/authorization.service";

describe("AuthorizationService", () => {
  let service: AuthorizationService;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;

  const mockPlayer: Player = {
    _id: "player-1",
    name: "Test User",
    teamId: "team-1",
    userId: "user-1",
    email: "test@example.com",
    role: PlayerRole.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOwner: Player = {
    _id: "player-2",
    name: "Owner",
    teamId: "team-1",
    userId: "owner-user",
    role: PlayerRole.OWNER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPlayerRepository = {
      findById: jest.fn(),
      findByTeamId: jest.fn(),
      findByUserId: jest.fn(),
      findByEmail: jest.fn(),
      findInvitedByTeamIdAndEmail: jest.fn(),
      findByTeamIdAndUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countByTeamId: jest.fn(),
      findTeamOwner: jest.fn(),
      findAdminsByTeamId: jest.fn(),
      existsInvitation: jest.fn(),
    } as jest.Mocked<IPlayerRepository>;

    service = new AuthorizationService(
      mockPlayerRepository,
    );
  });

  describe("verifyTeamRole", () => {
    it("should allow MEMBER role when player has any role", async () => {
      const member: Player = { ...mockPlayer, role: PlayerRole.MEMBER };
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(member);

      await service.verifyTeamRole("team-1", "user-1", PlayerRole.MEMBER);

      expect(mockPlayerRepository.findByTeamIdAndUserId).toHaveBeenCalledWith(
        "team-1",
        "user-1",
      );
    });

    it("should allow MEMBER role for ADMIN", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockPlayer);

      await service.verifyTeamRole("team-1", "user-1", PlayerRole.MEMBER);
    });

    it("should allow MEMBER role for OWNER", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockOwner);

      await service.verifyTeamRole("team-1", "owner-user", PlayerRole.MEMBER);
    });

    it("should reject MEMBER role when player has no role (pure player)", async () => {
      const purePlayer: Player = { ...mockPlayer, role: undefined };
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(purePlayer);

      await expect(
        service.verifyTeamRole("team-1", "user-1", PlayerRole.MEMBER),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("should throw AuthorizationError if user not found in team", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);

      await expect(
        service.verifyTeamRole("team-1", "user-1", PlayerRole.MEMBER),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("should allow ADMIN role for ADMIN", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockPlayer);

      await service.verifyTeamRole("team-1", "user-1", PlayerRole.ADMIN);
    });

    it("should allow ADMIN role for OWNER", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockOwner);

      await service.verifyTeamRole("team-1", "owner-user", PlayerRole.ADMIN);
    });

    it("should reject ADMIN role for MEMBER", async () => {
      const member: Player = { ...mockPlayer, role: PlayerRole.MEMBER };
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(member);

      await expect(
        service.verifyTeamRole("team-1", "user-1", PlayerRole.ADMIN),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("should allow OWNER role for OWNER", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockOwner);

      await service.verifyTeamRole("team-1", "owner-user", PlayerRole.OWNER);
    });

    it("should reject OWNER role for ADMIN", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockPlayer);

      await expect(
        service.verifyTeamRole("team-1", "user-1", PlayerRole.OWNER),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe("verifyIsTeamAdmin", () => {
    it("should verify user is team admin", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockPlayer);

      await service.verifyIsTeamAdmin("team-1", "user-1");

      expect(mockPlayerRepository.findByTeamIdAndUserId).toHaveBeenCalledWith(
        "team-1",
        "user-1",
      );
    });

    it("should verify user is team owner", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockOwner);

      await service.verifyIsTeamAdmin("team-1", "owner-user");

      expect(mockPlayerRepository.findByTeamIdAndUserId).toHaveBeenCalledWith(
        "team-1",
        "owner-user",
      );
    });

    it("should throw AuthorizationError if user is not admin", async () => {
      const member: Player = {
        ...mockPlayer,
        role: PlayerRole.MEMBER,
      };
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(member);

      await expect(
        service.verifyIsTeamAdmin("team-1", "user-1"),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("should throw AuthorizationError if user has no player record in team", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);

      await expect(
        service.verifyIsTeamAdmin("team-1", "user-1"),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe("verifyIsTeamOwner", () => {
    it("should verify user is team owner", async () => {
      mockPlayerRepository.findTeamOwner.mockResolvedValue(mockOwner);

      await service.verifyIsTeamOwner("team-1", "owner-user");

      expect(mockPlayerRepository.findTeamOwner).toHaveBeenCalledWith("team-1");
    });

    it("should throw AuthorizationError if user is not owner", async () => {
      mockPlayerRepository.findTeamOwner.mockResolvedValue(mockOwner);

      await expect(
        service.verifyIsTeamOwner("team-1", "user-1"),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("should throw AuthorizationError if team has no owner", async () => {
      mockPlayerRepository.findTeamOwner.mockResolvedValue(null);

      await expect(
        service.verifyIsTeamOwner("team-1", "user-1"),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe("verifyPlayerRole", () => {
    it("should verify user has specific role", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockPlayer);

      await service.verifyPlayerRole("team-1", "user-1", PlayerRole.ADMIN);

      expect(mockPlayerRepository.findByTeamIdAndUserId).toHaveBeenCalledWith(
        "team-1",
        "user-1",
      );
    });

    it("should throw AuthorizationError if user does not have role", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockPlayer);

      await expect(
        service.verifyPlayerRole("team-1", "user-1", PlayerRole.OWNER),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("should throw AuthorizationError if user not in team", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);

      await expect(
        service.verifyPlayerRole("team-1", "user-1", PlayerRole.ADMIN),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe("getPlayerRole", () => {
    it("should return player role", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockPlayer);

      const role = await service.getPlayerRole("team-1", "user-1");

      expect(role).toBe(PlayerRole.ADMIN);
    });

    it("should return null if user not in team", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);

      const role = await service.getPlayerRole("team-1", "user-1");

      expect(role).toBeNull();
    });

    it("should return null if player has no role", async () => {
      const purePlayer: Player = {
        ...mockPlayer,
        role: undefined,
      };
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(purePlayer);

      const role = await service.getPlayerRole("team-1", "user-1");

      expect(role).toBeNull();
    });

    it("should find correct team when user in multiple teams", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockPlayer);

      const role = await service.getPlayerRole("team-1", "user-1");

      expect(role).toBe(PlayerRole.ADMIN);
      expect(mockPlayerRepository.findByTeamIdAndUserId).toHaveBeenCalledWith(
        "team-1",
        "user-1",
      );
    });
  });
});
