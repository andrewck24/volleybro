import {
  createInvitedPlayer,
  createMockPlayerRepository,
  createUnlinkedPlayer,
} from "@/__tests__/helpers";
import { RejectInvitationUseCase } from "@/applications/usecases/player/reject-invitation.usecase";
import { AuthorizationError, NotFoundError } from "@/entities/errors";
import { PlayerRole, PlayerStatus } from "@/entities/player";

describe("RejectInvitationUseCase", () => {
  let usecase: RejectInvitationUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;

  const invitedPlayer = createInvitedPlayer({
    name: "test",
    userId: "user-1",
    number: undefined,
    position: undefined,
  });

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    usecase = new RejectInvitationUseCase(mockPlayerRepository);
  });

  it("turns the invitee back into an unlinked player", async () => {
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
    mockPlayerRepository.update.mockResolvedValue(createUnlinkedPlayer());

    await usecase.execute({ playerId: "player-1", userId: "user-1" });

    expect(mockPlayerRepository.update).toHaveBeenCalledWith("player-1", {
      status: PlayerStatus.NONE,
      userId: undefined,
      email: undefined,
      role: undefined,
    });
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
    const nonePlayer = createUnlinkedPlayer();
    mockPlayerRepository.findById.mockResolvedValue(nonePlayer);

    await expect(
      usecase.execute({ playerId: "player-1", userId: "user-1" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("clears the offered role when rejecting invitation", async () => {
    const adminInvite = createInvitedPlayer({
      userId: "user-1",
      role: PlayerRole.ADMIN,
    });
    mockPlayerRepository.findById.mockResolvedValue(adminInvite);
    mockPlayerRepository.update.mockResolvedValue(createUnlinkedPlayer());

    await usecase.execute({ playerId: "player-1", userId: "user-1" });

    expect(mockPlayerRepository.update).toHaveBeenCalledWith(
      "player-1",
      expect.objectContaining({ role: undefined }),
    );
  });
});
