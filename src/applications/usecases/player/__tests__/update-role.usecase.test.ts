import {
  createInvitedPlayer,
  createMockAuthorizationService,
  createMockPlayerRepository,
  createPlayer,
  createUnlinkedPlayer,
} from "@/__tests__/helpers";
import type { IUpdateRoleUseCase } from "@/applications/usecases/player/update-role.usecase";
import { UpdateRoleUseCase } from "@/applications/usecases/player/update-role.usecase";
import { ConflictError, NotFoundError, PlayerReason } from "@/entities/errors";
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

      expect(result).toMatchObject({ role: newRole });
    });

    it("should update an invitee's offered role", async () => {
      const playerId = "player_123";
      const newRole = PlayerRole.ADMIN;

      const invitee = createInvitedPlayer({
        id: playerId,
        teamId: "team_123",
        email: "invited@example.com",
      });

      mockPlayerRepository.findById.mockResolvedValue(invitee);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(
        createInvitedPlayer({
          id: playerId,
          teamId: "team_123",
          email: "invited@example.com",
          role: newRole,
        }),
      );

      const result = await useCase.execute({
        playerId,
        newRole,
        userId: "user_456",
      });

      expect(result).toMatchObject({ role: newRole });
    });

    it("should reject an unlinked player as the target", async () => {
      const playerId = "player_123";

      mockPlayerRepository.findById.mockResolvedValue(
        createUnlinkedPlayer({ id: playerId, teamId: "team_123" }),
      );
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();

      const attempt = useCase.execute({
        playerId,
        newRole: PlayerRole.ADMIN,
        userId: "user_456",
      });

      await expect(attempt).rejects.toBeInstanceOf(ConflictError);
      await expect(attempt).rejects.toMatchObject({
        reason: PlayerReason.TARGET_NOT_LINKED,
      });
      expect(mockPlayerRepository.update).not.toHaveBeenCalled();
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

      expect(result).toMatchObject({ role: newRole });
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
