import {
  createInvitedPlayer,
  createMockAuthorizationService,
  createMockPlayerRepository,
  createMockUserRepository,
  createPlayer,
  createUnlinkedPlayer,
  createUser,
} from "@/__tests__/helpers";
import type { ICreateInvitationUseCase } from "@/applications/usecases/player/create-invitation.usecase";
import { CreateInvitationUseCase } from "@/applications/usecases/player/create-invitation.usecase";
import {
  ConflictError,
  NotFoundError,
  UnexpectedError,
  CommonReason,
  PlayerReason,
} from "@/entities/errors";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { beforeEach, describe, expect, it } from "@jest/globals";

describe("CreateInvitationUseCase", () => {
  let useCase: ICreateInvitationUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockUserRepository: ReturnType<typeof createMockUserRepository>;
  let mockAuthService: ReturnType<typeof createMockAuthorizationService>;

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockUserRepository = createMockUserRepository();
    mockAuthService = createMockAuthorizationService();
    useCase = new CreateInvitationUseCase(
      mockPlayerRepository,
      mockUserRepository,
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

    /** No account holds the address, and nobody on the team was invited to it. */
    const unregistered = () => {
      mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([]);
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
    };

    it("stores the lowercased email when no account holds it", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      unregistered();
      mockPlayerRepository.update.mockResolvedValue(
        createInvitedPlayer({ id: playerId, teamId, email, role }),
      );

      const result = await useCase.execute({
        playerId,
        email: "  NewMember@Example.COM ",
        role,
        userId,
      });

      expect(result).toMatchObject({ email, role });
      expect(mockPlayerRepository.update).toHaveBeenCalledWith(playerId, {
        status: PlayerStatus.INVITED,
        role,
        userId: undefined,
        email,
      });
    });

    it("links the account when exactly one holds the address", async () => {
      const invitee = createUser({ id: "user_invitee", email });
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([invitee]);
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);
      mockPlayerRepository.update.mockResolvedValue(
        createInvitedPlayer({ id: playerId, teamId, userId: invitee.id, role }),
      );

      const result = await useCase.execute({ playerId, email, role, userId });

      expect(result).toMatchObject({ userId: invitee.id });
      expect(mockPlayerRepository.update).toHaveBeenCalledWith(playerId, {
        status: PlayerStatus.INVITED,
        role,
        userId: invitee.id,
        email: undefined,
      });
    });

    it("looks the address up trimmed and verbatim, so no character is a wildcard", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      unregistered();
      mockPlayerRepository.update.mockResolvedValue(createInvitedPlayer());

      await useCase.execute({
        playerId,
        email: " A.B@x.com ",
        role,
        userId,
      });

      expect(mockUserRepository.findAllByEmailInsensitive).toHaveBeenCalledWith(
        "A.B@x.com",
      );
    });

    it("refuses to guess when the address matches more than one account", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([
        createUser({ id: "user_a", email: "Twin@example.com" }),
        createUser({ id: "user_b", email: "twin@example.com" }),
      ]);

      await expect(
        useCase.execute({ playerId, email: "twin@example.com", role, userId }),
      ).rejects.toMatchObject({ reason: PlayerReason.AMBIGUOUS_EMAIL });
      expect(mockPlayerRepository.update).not.toHaveBeenCalled();
    });

    it("rejects an account that already has a player on this team", async () => {
      const invitee = createUser({ id: "user_invitee", email });
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([invitee]);
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        createPlayer({ id: "player_other", teamId, userId: invitee.id }),
      );

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toMatchObject({ reason: PlayerReason.ALREADY_ON_ROSTER });
      expect(mockPlayerRepository.update).not.toHaveBeenCalled();
    });

    it("rejects an unregistered address this team already invited", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([]);
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(
        createInvitedPlayer({ id: "player_other", teamId, email }),
      );

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toMatchObject({ reason: PlayerReason.ALREADY_ON_ROSTER });
      expect(mockPlayerRepository.update).not.toHaveBeenCalled();
    });

    it("reports a unique index violation as the same roster conflict", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      unregistered();
      mockPlayerRepository.update.mockRejectedValue(
        new ConflictError(
          CommonReason.DUPLICATE_RESOURCE,
          "A resource with the same identifier already exists",
        ),
      );

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toMatchObject({ reason: PlayerReason.ALREADY_ON_ROSTER });
    });

    it("should invite with ADMIN role", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      unregistered();
      mockPlayerRepository.update.mockResolvedValue(
        createInvitedPlayer({
          id: playerId,
          teamId,
          email,
          role: PlayerRole.ADMIN,
        }),
      );

      const result = await useCase.execute({
        playerId,
        email,
        role: PlayerRole.ADMIN,
        userId,
      });

      expect(result).toMatchObject({ role: PlayerRole.ADMIN });
    });

    it("should reject if player not found", async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject if player status is INVITED", async () => {
      mockPlayerRepository.findById.mockResolvedValue(
        createInvitedPlayer({
          id: playerId,
          teamId,
          email: "existing@example.com",
        }),
      );
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should reject if player status is JOINED", async () => {
      mockPlayerRepository.findById.mockResolvedValue(
        createPlayer({ id: playerId, teamId, userId: "some_user_id" }),
      );
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("tells a non-admin nothing about the invitation or the address", async () => {
      mockPlayerRepository.findById.mockResolvedValue(
        createInvitedPlayer({
          id: playerId,
          teamId,
          email: "existing@example.com",
        }),
      );
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error("User is not admin of this team"),
      );

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toThrow("User is not admin of this team");
      expect(
        mockUserRepository.findAllByEmailInsensitive,
      ).not.toHaveBeenCalled();
      expect(
        mockPlayerRepository.findInvitedByTeamIdAndEmail,
      ).not.toHaveBeenCalled();
      expect(mockPlayerRepository.update).not.toHaveBeenCalled();
    });

    it("should reject if update fails", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      unregistered();
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toBeInstanceOf(UnexpectedError);
    });
  });
});
