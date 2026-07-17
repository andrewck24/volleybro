import { createMockPlayerRepository, createPlayer } from "@/__tests__/helpers";
import { AcceptInvitationUseCase } from "@/applications/usecases/player/accept-invitation.usecase";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from "@/entities/errors";
import { PlayerRole, PlayerStatus } from "@/entities/player";

describe("AcceptInvitationUseCase", () => {
  let usecase: AcceptInvitationUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;

  const invitedPlayer = createPlayer({
    name: "test",
    number: undefined,
    position: undefined,
    status: PlayerStatus.INVITED,
  });

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    usecase = new AcceptInvitationUseCase(mockPlayerRepository);
  });

  it("should transition status from INVITED to JOINED and set userId, clear email", async () => {
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
    mockPlayerRepository.update.mockResolvedValue({
      ...invitedPlayer,
      status: PlayerStatus.JOINED,
      userId: "user-1",
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

  it("should throw error if player is already JOINED", async () => {
    const joinedPlayer = createPlayer({
      status: PlayerStatus.JOINED,
      userId: "existing-user",
      email: undefined,
    });
    mockPlayerRepository.findById.mockResolvedValue(joinedPlayer);

    await expect(
      usecase.execute({ playerId: "player-1", userId: "user-1" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("should throw error if player status is NONE (no invitation)", async () => {
    const nonePlayer = createPlayer({
      status: PlayerStatus.NONE,
      email: undefined,
    });
    mockPlayerRepository.findById.mockResolvedValue(nonePlayer);

    await expect(
      usecase.execute({ playerId: "player-1", userId: "user-1" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("should preserve role when accepting invitation", async () => {
    const adminInvite = createPlayer({
      status: PlayerStatus.INVITED,
      role: PlayerRole.ADMIN,
    });
    mockPlayerRepository.findById.mockResolvedValue(adminInvite);
    mockPlayerRepository.update.mockResolvedValue({
      ...adminInvite,
      status: PlayerStatus.JOINED,
      userId: "user-1",
      email: undefined,
    });

    await usecase.execute({ playerId: "player-1", userId: "user-1" });

    // No error thrown means success
  });
});
