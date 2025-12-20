import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { GetPlayerUseCase } from "@/applications/usecases/player/get-player.usecase";
import { Player, PlayerRole } from "@/entities/player";

describe("GetPlayerUseCase", () => {
  let usecase: GetPlayerUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;

  const mockPlayer: Player = {
    _id: "player-1",
    name: "Test Player",
    teamId: "team-1",
    userId: "user-1",
    email: "test@example.com",
    role: PlayerRole.MEMBER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPlayerRepository = {
      findById: jest.fn(),
      findByTeamId: jest.fn(),
      findByUserId: jest.fn(),
      findByEmail: jest.fn(),
      findInvitedByTeamIdAndEmail: jest.fn(),
      findByTeamIdAndUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countByTeamId: jest.fn(),
      findTeamOwner: jest.fn(),
      findAdminsByTeamId: jest.fn(),
      existsInvitation: jest.fn(),
    } as jest.Mocked<IPlayerRepository>;

    usecase = new GetPlayerUseCase(mockPlayerRepository);
  });

  it("should return player by ID", async () => {
    mockPlayerRepository.findById.mockResolvedValue(mockPlayer);

    const result = await usecase.execute("player-1");

    expect(result).toEqual(mockPlayer);
    expect(mockPlayerRepository.findById).toHaveBeenCalledWith("player-1");
  });

  it("should return null if player not found", async () => {
    mockPlayerRepository.findById.mockResolvedValue(null);

    const result = await usecase.execute("nonexistent");

    expect(result).toBeNull();
  });

  it("should return complete player information", async () => {
    mockPlayerRepository.findById.mockResolvedValue(mockPlayer);

    const result = await usecase.execute("player-1");

    expect(result?._id).toBe("player-1");
    expect(result?.name).toBe("Test Player");
    expect(result?.teamId).toBe("team-1");
    expect(result?.userId).toBe("user-1");
    expect(result?.email).toBe("test@example.com");
    expect(result?.role).toBe(PlayerRole.MEMBER);
  });

  it("should return invited player without userId", async () => {
    const invitedPlayer: Player = {
      ...mockPlayer,
      userId: undefined,
    };
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);

    const result = await usecase.execute("player-1");

    expect(result?.userId).toBeUndefined();
    expect(result?.email).toBeDefined();
  });

  it("should return pure player without email", async () => {
    const purePlayer: Player = {
      ...mockPlayer,
      email: undefined,
      userId: undefined,
    };
    mockPlayerRepository.findById.mockResolvedValue(purePlayer);

    const result = await usecase.execute("player-1");

    expect(result?.email).toBeUndefined();
    expect(result?.userId).toBeUndefined();
  });
});
