import {
  createMockAuthorizationService,
  createMockPlayerRepository,
  createPlayer,
} from "@/__tests__/helpers";
import { CreateInvitationUseCase } from "@/applications/usecases/player/create-invitation.usecase";
import type { ICreateInvitationUseCase } from "@/applications/usecases/player/create-invitation.usecase.interface";
import {
  ConflictError,
  NotFoundError,
  UnexpectedError,
} from "@/entities/errors/app-error";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { beforeEach, describe, expect, it } from "@jest/globals";

describe("CreateInvitationUseCase", () => {
  let useCase: ICreateInvitationUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockAuthService: ReturnType<typeof createMockAuthorizationService>;

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockAuthService = createMockAuthorizationService();
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

    const nonePlayer = createPlayer({
      id: playerId,
      name: "Pure Player",
      teamId,
      status: PlayerStatus.NONE,
      number: undefined,
      position: undefined,
      userId: undefined,
    });

    it("should invite a NONE player by setting status to INVITED and adding email", async () => {
      const invitedPlayer = {
        ...nonePlayer,
        status: PlayerStatus.INVITED,
        email,
        role,
      };

      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(invitedPlayer);

      const result = await useCase.execute(playerId, email, role, userId);

      expect(result.email).toBe(email);
      expect(result.role).toBe(role);
    });

    it("should invite with ADMIN role", async () => {
      const adminRole = PlayerRole.ADMIN;
      const invitedPlayer = {
        ...nonePlayer,
        status: PlayerStatus.INVITED,
        email,
        role: adminRole,
      };

      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(invitedPlayer);

      const result = await useCase.execute(playerId, email, adminRole, userId);

      expect(result.role).toBe(adminRole);
    });

    it("should reject if player not found", async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(playerId, email, role, userId),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject if player status is INVITED", async () => {
      const invitedPlayer = createPlayer({
        ...nonePlayer,
        status: PlayerStatus.INVITED,
        email: "existing@example.com",
      });

      mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);

      await expect(
        useCase.execute(playerId, email, role, userId),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should reject if player status is JOINED", async () => {
      const joinedPlayer = createPlayer({
        ...nonePlayer,
        status: PlayerStatus.JOINED,
        userId: "some_user_id",
      });

      mockPlayerRepository.findById.mockResolvedValue(joinedPlayer);

      await expect(
        useCase.execute(playerId, email, role, userId),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should reject if user is not team admin", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error("User is not admin of this team"),
      );

      await expect(
        useCase.execute(playerId, email, role, userId),
      ).rejects.toThrow("User is not admin of this team");
    });

    it("should reject if update fails", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(
        useCase.execute(playerId, email, role, userId),
      ).rejects.toBeInstanceOf(UnexpectedError);
    });
  });
});
