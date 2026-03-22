import {
  createMockAuthorizationService,
  createMockPlayerRepository,
  createPlayer,
} from "@/__tests__/helpers";
import { CreatePlayerUseCase } from "@/applications/usecases/player/create-player.usecase";
import type { ICreatePlayerUseCase } from "@/applications/usecases/player/create-player.usecase.interface";
import { ConflictError } from "@/entities/errors/app-error";
import { PlayerRole, PlayerStatus, Position } from "@/entities/player";
import { beforeEach, describe, expect, it } from "@jest/globals";

describe("CreatePlayerUseCase", () => {
  let useCase: ICreatePlayerUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockAuthService: ReturnType<typeof createMockAuthorizationService>;

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockAuthService = createMockAuthorizationService();
    useCase = new CreatePlayerUseCase(mockPlayerRepository, mockAuthService);
  });

  describe("execute", () => {
    it("should create a NONE status player", async () => {
      const teamId = "team_123";
      const userId = "user_456";
      const input = {
        name: "陳球員",
        number: 5,
        position: Position.MB,
        role: PlayerRole.MEMBER,
      };

      const createdPlayer = createPlayer({
        _id: "player_new_001",
        name: input.name,
        number: input.number,
        position: Position.MB,
        teamId,
        status: PlayerStatus.NONE,
        role: PlayerRole.MEMBER,
      });

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.create.mockResolvedValue(createdPlayer);

      const result = await useCase.execute(teamId, input, userId);

      expect(result).toEqual(createdPlayer);
    });

    it("should create a player with email as NONE status (invitation via CreateInvitationUseCase)", async () => {
      const teamId = "team_123";
      const userId = "user_456";
      const input = {
        name: "王小明",
        email: "wang@example.com",
        role: PlayerRole.ADMIN,
      };

      const createdPlayer = createPlayer({
        _id: "player_invited_001",
        name: input.name,
        email: input.email,
        role: input.role,
        status: PlayerStatus.NONE,
        teamId,
        number: undefined,
        position: undefined,
      });

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
      mockPlayerRepository.create.mockResolvedValue(createdPlayer);

      const result = await useCase.execute(teamId, input, userId);

      expect(result).toEqual(createdPlayer);
    });

    it("should reject if user is not admin", async () => {
      const teamId = "team_123";
      const userId = "user_456";
      const input = {
        name: "Test Player",
        role: PlayerRole.MEMBER,
      };

      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error("User not authorized"),
      );

      await expect(useCase.execute(teamId, input, userId)).rejects.toThrow(
        "User not authorized",
      );
    });

    it("should reject if email already invited in team", async () => {
      const teamId = "team_123";
      const userId = "user_456";
      const input = {
        name: "Test Player",
        email: "test@example.com",
        role: PlayerRole.MEMBER,
      };

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(
        createPlayer({
          _id: "player_123",
          name: "Test",
          teamId,
          email: input.email,
        }),
      );

      await expect(
        useCase.execute(teamId, input, userId),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should use default role MEMBER if not specified", async () => {
      const teamId = "team_123";
      const userId = "user_456";
      const input = {
        name: "Test Player",
        role: PlayerRole.MEMBER,
      };

      const createdPlayer = createPlayer({
        _id: "player_new_002",
        name: input.name,
        teamId,
        status: PlayerStatus.NONE,
        role: PlayerRole.MEMBER,
        number: undefined,
        position: undefined,
      });

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.create.mockResolvedValue(createdPlayer);

      const result = await useCase.execute(teamId, input, userId);

      expect(result.role).toBe(PlayerRole.MEMBER);
    });
  });
});
