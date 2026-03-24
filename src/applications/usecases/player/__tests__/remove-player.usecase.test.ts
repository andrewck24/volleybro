import {
  createMockAuthorizationService,
  createMockPlayerRepository,
  createMockTeamRepository,
  createPlayer,
} from "@/__tests__/helpers";
import { RemovePlayerUseCase } from "@/applications/usecases/player/remove-player.usecase";
import type { IRemovePlayerUseCase } from "@/applications/usecases/player/remove-player.usecase.interface";
import { NotFoundError, UnexpectedError } from "@/entities/errors/app-error";
import { beforeEach, describe, expect, it } from "@jest/globals";

describe("RemovePlayerUseCase", () => {
  let useCase: IRemovePlayerUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockAuthService: ReturnType<typeof createMockAuthorizationService>;
  let mockTeamRepository: ReturnType<typeof createMockTeamRepository>;

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockAuthService = createMockAuthorizationService();
    mockTeamRepository = createMockTeamRepository();
    useCase = new RemovePlayerUseCase(
      mockPlayerRepository,
      mockAuthService,
      mockTeamRepository,
    );
  });

  describe("execute", () => {
    it("should remove player from team", async () => {
      const player = createPlayer({
        _id: "player_123",
        teamId: "team_789",
        userId: "user_different",
      });

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.findById.mockResolvedValue(player);
      mockPlayerRepository.delete.mockResolvedValue(true);
      mockTeamRepository.removePlayerFromLineups.mockResolvedValue();

      const result = await useCase.execute("player_123", "user_456");

      expect(result).toEqual({ success: true });
    });

    it("should reject if player not found", async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute("player_999", "user_456"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject if user is not team admin", async () => {
      const player = createPlayer({
        _id: "player_123",
        teamId: "team_789",
        userId: "user_different",
      });

      mockPlayerRepository.findById.mockResolvedValue(player);
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error("User not authorized"),
      );

      await expect(useCase.execute("player_123", "user_456")).rejects.toThrow(
        "User not authorized",
      );
    });

    it("should reject if delete fails", async () => {
      const player = createPlayer({
        _id: "player_123",
        teamId: "team_789",
        userId: "user_different",
      });

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.findById.mockResolvedValue(player);
      mockPlayerRepository.delete.mockResolvedValue(false);

      await expect(
        useCase.execute("player_123", "user_456"),
      ).rejects.toBeInstanceOf(UnexpectedError);
    });
  });
});
