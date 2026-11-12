import {
  createInvitedPlayer,
  createPlayer,
  createUnlinkedPlayer,
  createUser,
} from "@test/support/fixtures/entities";
import { createMockAuthorizationService } from "@test/support/doubles/services";
import {
  createMockPlayerRepository,
  createMockUserRepository,
} from "@test/support/doubles/repositories";
import type { ICreateInvitationUseCase } from "@/applications/usecases/player/create-invitation.usecase";
import { CreateInvitationUseCase } from "@/applications/usecases/player/create-invitation.usecase";
import { ConflictError, NotFoundError, PlayerReason } from "@/entities/errors";
import { narrowPlayer, PlayerRole, type PlayerFields } from "@/entities/player";
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
    const applyPatchToNonePlayer = async (
      _id: string,
      patch: Partial<PlayerFields>,
    ) => narrowPlayer({ ...nonePlayer, ...patch } as PlayerFields);

    const noMatchingAccountOrInvitation = () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
    };

    it("stores the lowercased email when no account holds it", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      noMatchingAccountOrInvitation();
      mockPlayerRepository.update.mockImplementation(applyPatchToNonePlayer);

      const result = await useCase.execute({
        playerId,
        email: "  NewMember@Example.COM ",
        role,
        userId,
      });

      expect(result).toMatchObject({ email, role });
    });

    it("links the account when exactly one holds the address", async () => {
      const invitee = createUser({ id: "user_invitee", email });
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findByEmail.mockResolvedValue(invitee);
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);
      mockPlayerRepository.update.mockImplementation(applyPatchToNonePlayer);

      const result = await useCase.execute({ playerId, email, role, userId });

      expect(result).toMatchObject({
        userId: invitee.id,
        role,
        email: undefined,
      });
    });

    it("links the account that holds the normalized address", async () => {
      const invitee = createUser({ id: "user_invitee", email: "a.b@x.com" });
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findByEmail.mockImplementation(async (address) =>
        address === "a.b@x.com" ? invitee : null,
      );
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
      mockPlayerRepository.update.mockImplementation(applyPatchToNonePlayer);

      const result = await useCase.execute({
        playerId,
        email: " A.B@x.com ",
        role,
        userId,
      });

      expect(result).toMatchObject({ userId: invitee.id });
    });

    it("rejects an account whose address this team already invited", async () => {
      const invitee = createUser({ id: "user_invitee", email });
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findByEmail.mockResolvedValue(invitee);
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockImplementation(
        async (_team, address) =>
          address === email
            ? createInvitedPlayer({ id: "player_other", teamId, email })
            : null,
      );

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toMatchObject({ reason: PlayerReason.ALREADY_INVITED });
      expect(mockPlayerRepository.update).not.toHaveBeenCalled();
    });

    it("rejects an account that already has a player on this team", async () => {
      const invitee = createUser({ id: "user_invitee", email });
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findByEmail.mockResolvedValue(invitee);
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        createPlayer({ id: "player_other", teamId, userId: invitee.id }),
      );

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toMatchObject({ reason: PlayerReason.ALREADY_ON_ROSTER });
      expect(mockPlayerRepository.update).not.toHaveBeenCalled();
    });

    it("rejects as already invited an account invitation stored without an invitee address", async () => {
      const invitee = createUser({ id: "user_invitee", email });
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findByEmail.mockResolvedValue(invitee);
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        createInvitedPlayer({
          id: "player_other",
          teamId,
          userId: invitee.id,
        }),
      );

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toMatchObject({ reason: PlayerReason.ALREADY_INVITED });
      expect(mockPlayerRepository.update).not.toHaveBeenCalled();
    });

    it("rejects an unregistered address this team already invited", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(
        createInvitedPlayer({ id: "player_other", teamId, email }),
      );

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toMatchObject({ reason: PlayerReason.ALREADY_INVITED });
      expect(mockPlayerRepository.update).not.toHaveBeenCalled();
    });

    it("should invite with ADMIN role", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      noMatchingAccountOrInvitation();
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
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      expect(
        mockPlayerRepository.findInvitedByTeamIdAndEmail,
      ).not.toHaveBeenCalled();
      expect(mockPlayerRepository.update).not.toHaveBeenCalled();
    });

    it("propagates when the player disappears during update", async () => {
      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      noMatchingAccountOrInvitation();
      mockPlayerRepository.update.mockRejectedValue(
        new NotFoundError(PlayerReason.PLAYER_NOT_FOUND, "Player not found"),
      );

      await expect(
        useCase.execute({ playerId, email, role, userId }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
