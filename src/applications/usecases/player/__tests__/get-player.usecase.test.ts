import { createMockPlayerRepository, createPlayer } from "@/__tests__/helpers";
import { GetPlayerUseCase } from "@/applications/usecases/player/get-player.usecase";
import { PlayerRole } from "@/entities/player";

describe("GetPlayerUseCase", () => {
  let usecase: GetPlayerUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;

  const mockPlayer = createPlayer({
    email: "test@example.com",
  });

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    usecase = new GetPlayerUseCase(mockPlayerRepository);
  });

  it("should return player by ID", async () => {
    mockPlayerRepository.findById.mockResolvedValue(mockPlayer);

    const result = await usecase.execute("player-1");

    expect(result).toEqual(mockPlayer);
  });

  it("should return null if player not found", async () => {
    mockPlayerRepository.findById.mockResolvedValue(null);

    const result = await usecase.execute("nonexistent");

    expect(result).toBeNull();
  });

  it("should return complete player information", async () => {
    mockPlayerRepository.findById.mockResolvedValue(mockPlayer);

    const result = await usecase.execute("player-1");

    expect(result?.id).toBe("player-1");
    expect(result?.name).toBe("Test Player");
    expect(result?.teamId).toBe("team-1");
    expect(result?.userId).toBe("user-1");
    expect(result?.email).toBe("test@example.com");
    expect(result?.role).toBe(PlayerRole.MEMBER);
  });

  it("should return invited player without userId", async () => {
    const invitedPlayer = createPlayer({
      userId: undefined,
      email: "test@example.com",
    });
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);

    const result = await usecase.execute("player-1");

    expect(result?.userId).toBeUndefined();
    expect(result?.email).toBeDefined();
  });

  it("should return pure player without email", async () => {
    const purePlayer = createPlayer({
      email: undefined,
      userId: undefined,
    });
    mockPlayerRepository.findById.mockResolvedValue(purePlayer);

    const result = await usecase.execute("player-1");

    expect(result?.email).toBeUndefined();
    expect(result?.userId).toBeUndefined();
  });
});
