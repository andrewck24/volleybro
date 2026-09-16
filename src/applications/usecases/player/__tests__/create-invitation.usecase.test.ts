import {
  createInvitedPlayer,
  createMockAuthorizationService,
  createMockPlayerRepository,
  createPlayer,
  createUnlinkedPlayer,
} from "@/__tests__/helpers";
import type { ICreateInvitationUseCase } from "@/applications/usecases/player/create-invitation.usecase";
import { CreateInvitationUseCase } from "@/applications/usecases/player/create-invitation.usecase";
import {
  ConflictError,
  NotFoundError,
  UnexpectedError,
} from "@/entities/errors";
import { PlayerRole } from "@/entities/player";
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

    const nonePlayer = createUnlinkedPlayer({
      id: playerId,
      name: "Unlinked Player",
      teamId,
      number: undefined,
      position: undefined,
    });

    it("should invite a NONE player by setting status to INVITED and adding email", async () => {
      const invitedPlayer = createInvitedPlayer({
        id: playerId,
        teamId,
        email,
        role,
      });

      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(invitedPlayer);

      const result = await useCase.execute({ playerId, email, role, userId });

      expect(result).toMatchObject({ email, role });
    });

    it("should invite with ADMIN role", async () => {
      const adminRole = PlayerRole.ADMIN;
      const invitedPlayer = createInvitedPlayer({
        id: playerId,
        teamId,
        email,
        role: adminRole,
      });

      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(invitedPlayer);

      const result = await useCase.execute({
        playerId,
        email,
        role: adminRole,
        userId,
      });

      expect(result).toMatchObject({ role: adminRole });
    });

    it("should reject if player not found", async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject if player status is INVITED", async () => {
      const invitedPlayer = createInvitedPlayer({
        id: playerId,
        teamId,
        email: "existing@example.com",
      });

      mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should reject if player status is JOINED", async () => {
      const joinedPlayer = createPlayer({
        id: playerId,
        teamId,
        userId: "some_user_id",
      });

      mockPlayerRepository.findById.mockResolvedValue(joinedPlayer);

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should reject if user is not team admin", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error("User is not admin of this team"),
      );

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toThrow("User is not admin of this team");
    });

    it("should reject if update fails", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toBeInstanceOf(UnexpectedError);
    });
  });
});
