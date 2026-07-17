import {
  createMockAuthorizationService,
  createMockPlayerRepository,
  createPlayer,
} from "@/__tests__/helpers";
import type { IUpdateRoleUseCase } from "@/applications/usecases/player/update-role.usecase";
import { UpdateRoleUseCase } from "@/applications/usecases/player/update-role.usecase";
import { NotFoundError } from "@/entities/errors";
import { PlayerRole } from "@/entities/player";
import { beforeEach, describe, expect, it } from "@jest/globals";

describe("UpdateRoleUseCase", () => {
  let useCase: IUpdateRoleUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockAuthService: ReturnType<typeof createMockAuthorizationService>;

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockAuthService = createMockAuthorizationService();
    useCase = new UpdateRoleUseCase(mockPlayerRepository, mockAuthService);
  });

  describe("execute", () => {
    it("should update player role to ADMIN", async () => {
      const playerId = "player_123";
      const newRole = PlayerRole.ADMIN;
      const userId = "user_456";

      const currentPlayer = createPlayer({
        id: playerId,
        teamId: "team_123",
      });

      const updatedPlayer = createPlayer({
        ...currentPlayer,
        role: newRole,
      });

      mockPlayerRepository.findById.mockResolvedValue(currentPlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(updatedPlayer);

      const result = await useCase.execute({ playerId, newRole, userId });

      expect(result.role).toBe(newRole);
    });

    it("should allow ADMIN to downgrade own role to MEMBER", async () => {
      const playerId = "player_123";
      const userId = "player_123"; // Same user
      const newRole = PlayerRole.MEMBER;

      const currentPlayer = createPlayer({
        id: playerId,
        name: "Test Admin",
        teamId: "team_123",
        role: PlayerRole.ADMIN,
      });

      const updatedPlayer = createPlayer({
        ...currentPlayer,
        role: newRole,
      });

      mockPlayerRepository.findById.mockResolvedValue(currentPlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(updatedPlayer);

      const result = await useCase.execute({ playerId, newRole, userId });

      expect(result.role).toBe(newRole);
    });

    it("should prevent non-admin from updating roles", async () => {
      const playerId = "player_123";
      const newRole = PlayerRole.ADMIN;
      const userId = "user_456";

      const currentPlayer = createPlayer({
        id: playerId,
        teamId: "team_123",
      });

      mockPlayerRepository.findById.mockResolvedValue(currentPlayer);
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error("User is not admin"),
      );

      await expect(
        useCase.execute({ playerId, newRole, userId }),
      ).rejects.toThrow("User is not admin");
    });

    it("should reject if player not found", async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          playerId: "non_existent",
          newRole: PlayerRole.ADMIN,
          userId: "user_456",
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
