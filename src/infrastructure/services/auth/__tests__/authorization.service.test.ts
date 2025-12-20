import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { Player, PlayerRole } from "@/entities/player";
import { AuthorizationService } from "@/infrastructure/services/auth/authorization.service";

describe("AuthorizationService", () => {
  let service: AuthorizationService;
  let mockTeamRepository: jest.Mocked<ITeamRepository>;
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
    mockTeamRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ITeamRepository>;

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
      mockTeamRepository,
      mockPlayerRepository,
    );
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

    it("should throw error if user is not admin", async () => {
      const member: Player = {
        ...mockPlayer,
        role: PlayerRole.MEMBER,
      };
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(member);

      await expect(
        service.verifyIsTeamAdmin("team-1", "user-1"),
      ).rejects.toThrow("User is not admin of the team");
    });

    it("should throw error if user has no player record in team", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);

      await expect(
        service.verifyIsTeamAdmin("team-1", "user-1"),
      ).rejects.toThrow("User is not admin of the team");
    });
  });

  describe("verifyIsTeamOwner", () => {
    it("should verify user is team owner", async () => {
      mockPlayerRepository.findTeamOwner.mockResolvedValue(mockOwner);

      await service.verifyIsTeamOwner("team-1", "owner-user");

      expect(mockPlayerRepository.findTeamOwner).toHaveBeenCalledWith("team-1");
    });

    it("should throw error if user is not owner", async () => {
      mockPlayerRepository.findTeamOwner.mockResolvedValue(mockOwner);

      await expect(
        service.verifyIsTeamOwner("team-1", "user-1"),
      ).rejects.toThrow("User is not owner of the team");
    });

    it("should throw error if team has no owner", async () => {
      mockPlayerRepository.findTeamOwner.mockResolvedValue(null);

      await expect(
        service.verifyIsTeamOwner("team-1", "user-1"),
      ).rejects.toThrow("User is not owner of the team");
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

    it("should throw error if user does not have role", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockPlayer);

      await expect(
        service.verifyPlayerRole("team-1", "user-1", PlayerRole.OWNER),
      ).rejects.toThrow(`User does not have role ${PlayerRole.OWNER} in team`);
    });

    it("should throw error if user not in team", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);

      await expect(
        service.verifyPlayerRole("team-1", "user-1", PlayerRole.ADMIN),
      ).rejects.toThrow(`User does not have role ${PlayerRole.ADMIN} in team`);
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
