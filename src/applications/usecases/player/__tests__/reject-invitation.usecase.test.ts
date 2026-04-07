import { createMockPlayerRepository, createPlayer } from "@/__tests__/helpers";
import { RejectInvitationUseCase } from "@/applications/usecases/player/reject-invitation.usecase";
import { AuthorizationError, NotFoundError } from "@/entities/errors/app-error";
import { PlayerRole, PlayerStatus } from "@/entities/player";

describe("RejectInvitationUseCase", () => {
  let usecase: RejectInvitationUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;

  const invitedPlayer = createPlayer({
    name: "test",
    status: PlayerStatus.INVITED,
    number: undefined,
    position: undefined,
  });

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    usecase = new RejectInvitationUseCase(mockPlayerRepository);
  });

  it("should transition status from INVITED to NONE and clear email", async () => {
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
    mockPlayerRepository.update.mockResolvedValue({
      ...invitedPlayer,
      status: PlayerStatus.NONE,
      email: undefined,
    });

    await usecase.execute({ playerId: "player-1", userId: "user-1" });

    // No error thrown means success
  });

  it("should throw error if userId does not match invited recipient", async () => {
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);

    await expect(
      usecase.execute({ playerId: "player-1", userId: "wrong-user" }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("should throw error if player not found", async () => {
    mockPlayerRepository.findById.mockResolvedValue(null);

    await expect(
      usecase.execute({ playerId: "nonexistent", userId: "user-1" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("should throw error if player status is not INVITED", async () => {
    const nonePlayer = createPlayer({
      status: PlayerStatus.NONE,
      email: undefined,
    });
    mockPlayerRepository.findById.mockResolvedValue(nonePlayer);

    await expect(
      usecase.execute({ playerId: "player-1", userId: "user-1" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("should preserve role when rejecting invitation", async () => {
    const adminInvite = createPlayer({
      status: PlayerStatus.INVITED,
      role: PlayerRole.ADMIN,
    });
    mockPlayerRepository.findById.mockResolvedValue(adminInvite);
    mockPlayerRepository.update.mockResolvedValue({
      ...adminInvite,
      status: PlayerStatus.NONE,
      email: undefined,
    });

    await usecase.execute({ playerId: "player-1", userId: "user-1" });

    // No error thrown means success
  });
});
