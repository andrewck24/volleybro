import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { GetUserPlayersUseCase } from "@/applications/usecases/player/get-user-players.usecase";
import { Player, PlayerRole, PlayerStatus } from "@/entities/player";

describe("GetUserPlayersUseCase", () => {
  let usecase: GetUserPlayersUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;

  const mockPlayers: Player[] = [
    {
      _id: "player-1",
      name: "User",
      teamId: "team-1",
      status: PlayerStatus.JOINED,
      userId: "user-1",
      role: PlayerRole.MEMBER,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: "player-2",
      name: "User",
      teamId: "team-2",
      status: PlayerStatus.JOINED,
      userId: "user-1",
      role: PlayerRole.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    mockPlayerRepository = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
      findByTeamId: jest.fn(),
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
      linkUserToInvitations: jest.fn(),
    } as jest.Mocked<IPlayerRepository>;

    usecase = new GetUserPlayersUseCase(mockPlayerRepository);
  });

  it("should return all players for a user", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue(mockPlayers);

    const result = await usecase.execute("user-1");

    expect(result).toEqual(mockPlayers);
    expect(mockPlayerRepository.findByUserId).toHaveBeenCalledWith("user-1");
  });

  it("should return empty array if user has no players", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue([]);

    const result = await usecase.execute("user-1");

    expect(result).toEqual([]);
  });

  it("should return multiple players for user", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue(mockPlayers);

    const result = await usecase.execute("user-1");

    expect(result).toHaveLength(2);
    expect(result[0].teamId).toBe("team-1");
    expect(result[1].teamId).toBe("team-2");
  });

  it("should include both MEMBER and ADMIN roles", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue(mockPlayers);

    const result = await usecase.execute("user-1");

    expect(result[0].role).toBe(PlayerRole.MEMBER);
    expect(result[1].role).toBe(PlayerRole.ADMIN);
  });

  it("should include status field in results", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue(mockPlayers);

    const result = await usecase.execute("user-1");

    expect(result.every((p) => p.status === PlayerStatus.JOINED)).toBe(true);
  });

  it("should include userId field in results", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue(mockPlayers);

    const result = await usecase.execute("user-1");

    expect(result.every((p) => p.userId === "user-1")).toBe(true);
  });
});
