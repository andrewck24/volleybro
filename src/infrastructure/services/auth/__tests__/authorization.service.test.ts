import {
  createInvitedPlayer,
  createPlayer,
  createUnlinkedPlayer,
} from "@test/support/fixtures/entities";
import { createMockPlayerRepository } from "@test/support/doubles/repositories";
import { AuthorizationError, AuthReason } from "@/entities/errors";
import { PlayerRole } from "@/entities/player";
import { AuthorizationService } from "@/infrastructure/services/auth/authorization.service";

const expectReason = async (promise: Promise<unknown>, reason: AuthReason) => {
  await expect(promise).rejects.toBeInstanceOf(AuthorizationError);
  await expect(promise).rejects.toMatchObject({ reason });
};

describe("AuthorizationService", () => {
  let service: AuthorizationService;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;

  const mockPlayer = createPlayer({ role: PlayerRole.ADMIN });

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    service = new AuthorizationService(mockPlayerRepository);
  });

  describe("verifyTeamRole", () => {
    it("should allow MEMBER role for a member", async () => {
      const member = createPlayer({ role: PlayerRole.MEMBER });
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(member);

      await service.verifyTeamRole("team-1", "user-1", PlayerRole.MEMBER);

      expect(mockPlayerRepository.findByTeamIdAndUserId).toHaveBeenCalledWith(
        "team-1",
        "user-1",
      );
    });

    it("should allow MEMBER role for ADMIN", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockPlayer);

      await service.verifyTeamRole("team-1", "user-1", PlayerRole.MEMBER);
    });

    it("should reject an unlinked player as NOT_TEAM_MEMBER", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        createUnlinkedPlayer(),
      );

      await expectReason(
        service.verifyTeamRole("team-1", "user-1", PlayerRole.MEMBER),
        AuthReason.NOT_TEAM_MEMBER,
      );
    });

    it.each([PlayerRole.MEMBER, PlayerRole.ADMIN])(
      "should reject an invitee offered %s as NOT_TEAM_MEMBER",
      async (role) => {
        mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
          createInvitedPlayer({ userId: "user-1", role }),
        );

        await expectReason(
          service.verifyTeamRole("team-1", "user-1", PlayerRole.MEMBER),
          AuthReason.NOT_TEAM_MEMBER,
        );
      },
    );

    it("should reject an invitee offered ADMIN on the admin check", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        createInvitedPlayer({ userId: "user-1", role: PlayerRole.ADMIN }),
      );

      await expectReason(
        service.verifyTeamRole("team-1", "user-1", PlayerRole.ADMIN),
        AuthReason.NOT_TEAM_MEMBER,
      );
    });

    it("should throw NOT_TEAM_MEMBER if user not found in team", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);

      await expectReason(
        service.verifyTeamRole("team-1", "user-1", PlayerRole.MEMBER),
        AuthReason.NOT_TEAM_MEMBER,
      );
    });

    it("should allow ADMIN role for ADMIN", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(mockPlayer);

      await service.verifyTeamRole("team-1", "user-1", PlayerRole.ADMIN);
    });

    it("should reject ADMIN role for MEMBER as INSUFFICIENT_ROLE", async () => {
      const member = createPlayer({ role: PlayerRole.MEMBER });
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(member);

      await expectReason(
        service.verifyTeamRole("team-1", "user-1", PlayerRole.ADMIN),
        AuthReason.INSUFFICIENT_ROLE,
      );
    });
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

    it("should throw INSUFFICIENT_ROLE if user is only a member", async () => {
      const member = createPlayer({ role: PlayerRole.MEMBER });
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(member);

      await expectReason(
        service.verifyIsTeamAdmin("team-1", "user-1"),
        AuthReason.INSUFFICIENT_ROLE,
      );
    });

    it("should throw NOT_TEAM_MEMBER for an invitee offered ADMIN", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        createInvitedPlayer({ userId: "user-1", role: PlayerRole.ADMIN }),
      );

      await expectReason(
        service.verifyIsTeamAdmin("team-1", "user-1"),
        AuthReason.NOT_TEAM_MEMBER,
      );
    });

    it("should throw NOT_TEAM_MEMBER if user has no player in team", async () => {
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);

      await expectReason(
        service.verifyIsTeamAdmin("team-1", "user-1"),
        AuthReason.NOT_TEAM_MEMBER,
      );
    });
  });
});
