import { createPlayer, createUnlinkedPlayer } from "@/__tests__/helpers";
import { NotFoundError, ValidationError } from "@/entities/errors";
import { type NewPlayer, PlayerRole, PlayerStatus } from "@/entities/player";
import { PlayerModel } from "@/infrastructure/db/mongoose/schemas/player";
import { PlayerRepositoryImpl } from "@/infrastructure/db/repositories/player.repository.mongo";

// Mock the PlayerModel
jest.mock("@/infrastructure/db/mongoose/schemas/player", () => ({
  PlayerModel: {
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
  },
}));

describe("PlayerRepository", () => {
  let repository: PlayerRepositoryImpl;
  const mockPlayer = createPlayer();
  const mockPlayerRaw = { _id: mockPlayer.id, ...mockPlayer };

  beforeEach(() => {
    repository = new PlayerRepositoryImpl();
    jest.clearAllMocks();
  });

  describe("findById", () => {
    it("should return player by id", async () => {
      const mockExec = jest.fn().mockResolvedValue({
        toObject: () => mockPlayerRaw,
      });
      (PlayerModel.findById as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findById("player-1");

      expect(PlayerModel.findById).toHaveBeenCalledWith("player-1");
      expect(result).toMatchObject(mockPlayer);
    });

    it("should return null if player not found", async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      (PlayerModel.findById as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findByTeamId", () => {
    it("should return all players in a team", async () => {
      const mockExec = jest
        .fn()
        .mockResolvedValue([{ toObject: () => mockPlayerRaw }]);
      (PlayerModel.find as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findByTeamId("team-1");

      expect(PlayerModel.find).toHaveBeenCalledWith({ teamId: "team-1" });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject(mockPlayer);
    });

    it("should return empty array if no players in team", async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      (PlayerModel.find as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findByTeamId("empty-team");

      expect(result).toEqual([]);
    });
  });

  describe("findByUserId", () => {
    it("should return all players for a user", async () => {
      const mockExec = jest
        .fn()
        .mockResolvedValue([{ toObject: () => mockPlayerRaw }]);
      (PlayerModel.find as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findByUserId("user-1");

      expect(PlayerModel.find).toHaveBeenCalledWith({ userId: "user-1" });
      expect(result).toHaveLength(1);
    });
  });

  describe("findByEmail", () => {
    it("should return players by email", async () => {
      const mockExec = jest
        .fn()
        .mockResolvedValue([{ toObject: () => mockPlayerRaw }]);
      (PlayerModel.find as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findByEmail("test@example.com");

      expect(PlayerModel.find).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("findInvitedByTeamIdAndEmail", () => {
    it("should return invited player", async () => {
      const mockExec = jest.fn().mockResolvedValue({
        toObject: () => mockPlayerRaw,
      });
      (PlayerModel.findOne as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findInvitedByTeamIdAndEmail(
        "team-1",
        "test@example.com",
      );

      expect(PlayerModel.findOne).toHaveBeenCalledWith({
        teamId: "team-1",
        email: "test@example.com",
      });
      expect(result).toMatchObject(mockPlayer);
    });

    it("should return null if invitation not found", async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      (PlayerModel.findOne as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findInvitedByTeamIdAndEmail(
        "team-1",
        "nonexistent@example.com",
      );

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create and return new player", async () => {
      const playerInput: NewPlayer = {
        name: "New Player",
        status: PlayerStatus.NONE,
        teamId: "team-1",
      };
      (PlayerModel.create as jest.Mock).mockResolvedValue({
        toObject: () => ({ _id: "new-id", ...playerInput }),
      });

      const result = await repository.create(playerInput);

      expect(PlayerModel.create).toHaveBeenCalledWith(playerInput);
      expect(result.name).toBe("New Player");
    });
  });

  describe("linkUserToInvitations", () => {
    const mockCollation = (modifiedCount: number) => {
      const collation = jest.fn().mockResolvedValue({ modifiedCount });
      (PlayerModel.updateMany as jest.Mock).mockReturnValue({ collation });
      return collation;
    };

    it("links pending invited players by email to userId using updateMany", async () => {
      const collation = mockCollation(2);

      const count = await repository.linkUserToInvitations(
        "alice@example.com",
        "user-1",
      );

      expect(PlayerModel.updateMany).toHaveBeenCalledWith(
        { email: "alice@example.com", status: PlayerStatus.INVITED },
        {
          $set: { userId: "user-1", status: PlayerStatus.INVITED },
          $unset: { email: "" },
        },
      );
      expect(collation).toHaveBeenCalledWith({ locale: "en", strength: 2 });
      expect(count).toBe(2);
    });

    it("returns 0 when no matching invitations exist", async () => {
      mockCollation(0);

      const count = await repository.linkUserToInvitations(
        "nobody@example.com",
        "user-2",
      );

      expect(count).toBe(0);
    });
  });

  describe("update", () => {
    it("should update and return updated player", async () => {
      const updates = { role: PlayerRole.ADMIN };
      const mockExec = jest.fn().mockResolvedValue({
        toObject: () => ({ _id: mockPlayer.id, ...mockPlayer, ...updates }),
      });
      (PlayerModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.update("player-1", updates);

      expect(PlayerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "player-1",
        { $set: { role: PlayerRole.ADMIN } },
        { new: true },
      );
      expect(result).toMatchObject({ role: PlayerRole.ADMIN });
    });

    it("should $unset fields with undefined values", async () => {
      const updates = {
        status: PlayerStatus.NONE,
        userId: undefined,
        email: undefined,
      };
      const unlinked = createUnlinkedPlayer({ id: mockPlayer.id });
      const mockExec = jest.fn().mockResolvedValue({
        toObject: () => ({ _id: unlinked.id, ...unlinked }),
      });
      (PlayerModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.update("player-1", updates);

      expect(PlayerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "player-1",
        {
          $set: { status: PlayerStatus.NONE },
          $unset: { userId: "", email: "" },
        },
        { new: true },
      );
      expect(result?.status).toBe(PlayerStatus.NONE);
    });

    it("should throw NotFoundError if player not found during update", async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      (PlayerModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      await expect(repository.update("nonexistent", {})).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("delete", () => {
    it("should delete player and return true", async () => {
      const mockExec = jest.fn().mockResolvedValue(mockPlayer);
      (PlayerModel.findByIdAndDelete as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.delete("player-1");

      expect(PlayerModel.findByIdAndDelete).toHaveBeenCalledWith("player-1");
      expect(result).toBe(true);
    });

    it("should return false if player not found", async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      (PlayerModel.findByIdAndDelete as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.delete("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("countByTeamId", () => {
    it("should return count of players in team", async () => {
      const mockExec = jest.fn().mockResolvedValue(5);
      (PlayerModel.countDocuments as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.countByTeamId("team-1");

      expect(PlayerModel.countDocuments).toHaveBeenCalledWith({
        teamId: "team-1",
      });
      expect(result).toBe(5);
    });
  });

  describe("findTeamOwner", () => {
    it("should return team owner", async () => {
      const owner = {
        _id: mockPlayer.id,
        ...mockPlayer,
        role: PlayerRole.OWNER,
      };
      const mockExec = jest.fn().mockResolvedValue({
        toObject: () => owner,
      });
      (PlayerModel.findOne as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findTeamOwner("team-1");

      expect(PlayerModel.findOne).toHaveBeenCalledWith({
        teamId: "team-1",
        role: "OWNER",
      });
      expect(result).toMatchObject({ role: PlayerRole.OWNER });
    });
  });

  describe("findAdminsByTeamId", () => {
    it("should return all admins and owner in team", async () => {
      const mockExec = jest
        .fn()
        .mockResolvedValue([{ toObject: () => mockPlayerRaw }]);
      (PlayerModel.find as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findAdminsByTeamId("team-1");

      expect(PlayerModel.find).toHaveBeenCalledWith({
        teamId: "team-1",
        role: { $in: ["ADMIN", "OWNER"] },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("existsInvitation", () => {
    it("should return true if invitation exists", async () => {
      const mockExec = jest.fn().mockResolvedValue(1);
      (PlayerModel.countDocuments as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.existsInvitation(
        "team-1",
        "test@example.com",
      );

      expect(result).toBe(true);
    });

    it("should return false if invitation does not exist", async () => {
      const mockExec = jest.fn().mockResolvedValue(0);
      (PlayerModel.countDocuments as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.existsInvitation(
        "team-1",
        "nonexistent@example.com",
      );

      expect(result).toBe(false);
    });
  });

  describe("narrowing a stored document", () => {
    const read = async (raw: Record<string, unknown>) => {
      (PlayerModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ toObject: () => raw }),
      });
      return repository.findById("player-1");
    };

    const base = {
      _id: "player-1",
      name: "Test Player",
      teamId: "team-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("narrows an unlinked player", async () => {
      await expect(read({ ...base, status: "NONE" })).resolves.toMatchObject({
        status: PlayerStatus.NONE,
      });
    });

    it("narrows an invitee", async () => {
      await expect(
        read({
          ...base,
          status: "INVITED",
          email: "alice@example.com",
          role: "MEMBER",
        }),
      ).resolves.toMatchObject({ status: PlayerStatus.INVITED });
    });

    it("narrows a team member", async () => {
      await expect(
        read({ ...base, status: "JOINED", userId: "user-1", role: "OWNER" }),
      ).resolves.toMatchObject({ status: PlayerStatus.JOINED });
    });

    it("rejects a document without a status", async () => {
      await expect(read(base)).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects an unlinked player carrying a role", async () => {
      await expect(
        read({ ...base, status: "NONE", role: "MEMBER" }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects an invitee carrying both userId and email", async () => {
      await expect(
        read({
          ...base,
          status: "INVITED",
          userId: "user-1",
          email: "alice@example.com",
          role: "MEMBER",
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });
});
