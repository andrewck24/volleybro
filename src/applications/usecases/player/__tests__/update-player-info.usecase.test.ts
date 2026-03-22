import {
  createMockAuthorizationService,
  createMockPlayerRepository,
  createPlayer,
} from "@/__tests__/helpers";
import { UpdatePlayerInfoUseCase } from "@/applications/usecases/player/update-player-info.usecase";
import type { IUpdatePlayerInfoUseCase } from "@/applications/usecases/player/update-player-info.usecase.interface";
import { NotFoundError } from "@/entities/errors/app-error";
import { Position } from "@/entities/player";
import { beforeEach, describe, expect, it } from "@jest/globals";

describe("UpdatePlayerInfoUseCase", () => {
  let useCase: IUpdatePlayerInfoUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockAuthService: ReturnType<typeof createMockAuthorizationService>;

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockAuthService = createMockAuthorizationService();
    useCase = new UpdatePlayerInfoUseCase(
      mockPlayerRepository,
      mockAuthService,
    );
  });

  describe("execute", () => {
    it("should update player name and number", async () => {
      const updateData = {
        name: "新名字",
        number: 10,
      };

      const currentPlayer = createPlayer({
        _id: "player_123",
        name: "Old Name",
        number: 5,
        teamId: "team_123",
      });

      const updatedPlayer = createPlayer({
        ...currentPlayer,
        ...updateData,
      });

      mockPlayerRepository.findById.mockResolvedValue(currentPlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(updatedPlayer);

      const result = await useCase.execute(
        "player_123",
        updateData,
        "user_456",
      );

      expect(result.name).toBe(updateData.name);
      expect(result.number).toBe(updateData.number);
    });

    it("should update player position", async () => {
      const updateData = {
        position: Position.OH,
      };

      const currentPlayer = createPlayer({
        _id: "player_123",
        teamId: "team_123",
      });

      const updatedPlayer = createPlayer({
        ...currentPlayer,
        position: Position.OH,
      });

      mockPlayerRepository.findById.mockResolvedValue(currentPlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(updatedPlayer);

      const result = await useCase.execute(
        "player_123",
        updateData,
        "user_456",
      );

      expect(result.position).toBe(updateData.position);
    });

    it("should not update email field", async () => {
      const updateData = {
        name: "New Name",
      };

      const currentPlayer = createPlayer({
        _id: "player_123",
        name: "Old Name",
        email: "test@example.com",
        teamId: "team_123",
      });

      mockPlayerRepository.findById.mockResolvedValue(currentPlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(
        createPlayer({ ...currentPlayer, ...updateData }),
      );

      const result = await useCase.execute("player_123", updateData, "user_456");

      expect(result.name).toBe(updateData.name);
    });

    it("should prevent non-admin from updating", async () => {
      mockPlayerRepository.findById.mockResolvedValue(
        createPlayer({ _id: "player_123", teamId: "team_123" }),
      );
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error("Not admin"),
      );

      await expect(
        useCase.execute("player_123", { name: "New" }, "user_456"),
      ).rejects.toThrow("Not admin");
    });

    it("should reject if player not found", async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute("non_existent", { name: "New" }, "user_456"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
