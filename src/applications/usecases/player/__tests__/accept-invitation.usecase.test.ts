import {
  createInvitedPlayer,
  createMockPlayerRepository,
  createPlayer,
  createUnlinkedPlayer,
} from "@/__tests__/helpers";
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

  const invitedPlayer = createInvitedPlayer({
    name: "test",
    number: undefined,
    position: undefined,
    userId: "user-1",
  });

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    usecase = new AcceptInvitationUseCase(mockPlayerRepository);
  });

  it("should transition status from INVITED to JOINED and set userId, clear email", async () => {
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
    mockPlayerRepository.update.mockResolvedValue(
      createPlayer({ name: "test", number: undefined, position: undefined }),
    );

    await usecase.execute({ playerId: "player-1", userId: "user-1" });

    expect(mockPlayerRepository.update).toHaveBeenCalledWith("player-1", {
      status: PlayerStatus.JOINED,
      userId: "user-1",
      email: undefined,
    });
  });

  it("should return the invitation it read, so callers know the team", async () => {
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
    mockPlayerRepository.update.mockResolvedValue(
      createPlayer({ name: "test", number: undefined, position: undefined }),
    );

    const result = await usecase.execute({
      playerId: "player-1",
      userId: "user-1",
    });

    expect(result).toEqual(invitedPlayer);
    expect(result.teamId).toBe("team-1");
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
    const joinedPlayer = createPlayer({ userId: "existing-user" });
    mockPlayerRepository.findById.mockResolvedValue(joinedPlayer);

    await expect(
      usecase.execute({ playerId: "player-1", userId: "user-1" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("should throw error if player status is NONE (no invitation)", async () => {
    const nonePlayer = createUnlinkedPlayer();
    mockPlayerRepository.findById.mockResolvedValue(nonePlayer);

    await expect(
      usecase.execute({ playerId: "player-1", userId: "user-1" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("should preserve role when accepting invitation", async () => {
    const adminInvite = createInvitedPlayer({
      userId: "user-1",
      role: PlayerRole.ADMIN,
    });
    mockPlayerRepository.findById.mockResolvedValue(adminInvite);
    mockPlayerRepository.update.mockResolvedValue(
      createPlayer({ role: PlayerRole.ADMIN }),
    );

    await usecase.execute({ playerId: "player-1", userId: "user-1" });

    expect(mockPlayerRepository.update).toHaveBeenCalledWith(
      "player-1",
      expect.not.objectContaining({ role: expect.anything() }),
    );
  });
});
