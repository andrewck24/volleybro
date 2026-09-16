import {
  createInvitedPlayer,
  createMockPlayerRepository,
  createPlayer,
  createUnlinkedPlayer,
} from "@/__tests__/helpers";
import { GetPlayerUseCase } from "@/applications/usecases/player/get-player.usecase";
import { PlayerRole, PlayerStatus } from "@/entities/player";

describe("GetPlayerUseCase", () => {
  let usecase: GetPlayerUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;

  const mockPlayer = createPlayer();

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    usecase = new GetPlayerUseCase(mockPlayerRepository);
  });

  it("should return player by ID", async () => {
    mockPlayerRepository.findById.mockResolvedValue(mockPlayer);

    const result = await usecase.execute({ playerId: "player-1" });

    expect(result).toEqual(mockPlayer);
  });

  it("should return null if player not found", async () => {
    mockPlayerRepository.findById.mockResolvedValue(null);

    const result = await usecase.execute({ playerId: "nonexistent" });

    expect(result).toBeNull();
  });

  it("should return complete member information", async () => {
    mockPlayerRepository.findById.mockResolvedValue(mockPlayer);

    const result = await usecase.execute({ playerId: "player-1" });

    expect(result).toMatchObject({
      id: "player-1",
      name: "Test Player",
      teamId: "team-1",
      status: PlayerStatus.JOINED,
      userId: "user-1",
      role: PlayerRole.MEMBER,
    });
    expect(result).not.toHaveProperty("email");
  });

  it("should return an invitee reachable by email, without a userId", async () => {
    mockPlayerRepository.findById.mockResolvedValue(
      createInvitedPlayer({ email: "test@example.com" }),
    );

    const result = await usecase.execute({ playerId: "player-1" });

    expect(result).toMatchObject({
      status: PlayerStatus.INVITED,
      email: "test@example.com",
      role: PlayerRole.MEMBER,
    });
    expect(result).not.toHaveProperty("userId");
  });

  it("should return an unlinked player without userId, email or role", async () => {
    mockPlayerRepository.findById.mockResolvedValue(createUnlinkedPlayer());

    const result = await usecase.execute({ playerId: "player-1" });

    expect(result).toMatchObject({ status: PlayerStatus.NONE });
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("role");
  });
});
