import { createPlayer, createUnlinkedPlayer } from "@/__tests__/helpers";
import { PlayerRole, Position } from "@/entities/player";
import {
  CreatePlayerSchema,
  PlayerSchema,
  UpdatePlayerInfoSchema,
  UpdatePlayerRoleSchema,
} from "../player";

describe("Player Validation Schemas", () => {
  describe("CreatePlayerSchema", () => {
    it("should accept valid player creation input", () => {
      const input = {
        name: "John Doe",
        number: 10,
        position: Position.OH,
        role: PlayerRole.MEMBER,
        email: "john@example.com",
      };

      const result = CreatePlayerSchema.parse(input);
      expect(result).toEqual(input);
    });

    it("should accept player creation without email (unlinked player)", () => {
      const input = {
        name: "Opponent Player",
        number: 7,
        position: Position.S,
      };

      const result = CreatePlayerSchema.parse(input);
      expect(result.name).toBe("Opponent Player");
      expect(result.email).toBeUndefined();
      expect(result.role).toBeUndefined();
    });

    it("should reject a role without an email to invite", () => {
      expect(() =>
        CreatePlayerSchema.parse({ name: "Member", role: PlayerRole.MEMBER }),
      ).toThrow();
    });

    it("should reject OWNER, which only a transfer can grant", () => {
      expect(() =>
        CreatePlayerSchema.parse({
          name: "Member",
          email: "member@example.com",
          role: PlayerRole.OWNER,
        }),
      ).toThrow();
    });

    it("should reject empty name", () => {
      const input = {
        name: "",
      };

      expect(() => CreatePlayerSchema.parse(input)).toThrow();
    });

    it("should reject invalid number (out of range)", () => {
      const input = {
        name: "Player",
        number: 100,
      };

      expect(() => CreatePlayerSchema.parse(input)).toThrow();
    });

    it("should reject invalid email format", () => {
      const input = {
        name: "Player",
        email: "invalid-email",
      };

      expect(() => CreatePlayerSchema.parse(input)).toThrow();
    });
  });

  describe("UpdatePlayerInfoSchema", () => {
    it("should accept partial updates", () => {
      const input = {
        name: "Updated Name",
      };

      const result = UpdatePlayerInfoSchema.parse(input);
      expect(result.name).toBe("Updated Name");
    });

    it("should accept all fields", () => {
      const input = {
        name: "John",
        number: 5,
        position: Position.MB,
      };

      const result = UpdatePlayerInfoSchema.parse(input);
      expect(result).toEqual(input);
    });

    it("should reject empty name", () => {
      const input = {
        name: "",
      };

      expect(() => UpdatePlayerInfoSchema.parse(input)).toThrow();
    });

    it("should reject invalid number", () => {
      const input = {
        number: 150,
      };

      expect(() => UpdatePlayerInfoSchema.parse(input)).toThrow();
    });

    it("should allow empty object (no updates)", () => {
      const result = UpdatePlayerInfoSchema.parse({});
      expect(result).toEqual({});
    });
  });

  describe("UpdatePlayerRoleSchema", () => {
    it("should accept valid role", () => {
      const input = {
        role: PlayerRole.ADMIN,
      };

      const result = UpdatePlayerRoleSchema.parse(input);
      expect(result.role).toBe(PlayerRole.ADMIN);
    });

    it("should reject invalid role", () => {
      const input = {
        role: "INVALID",
      };

      expect(() => UpdatePlayerRoleSchema.parse(input)).toThrow();
    });
  });

  describe("PlayerSchema", () => {
    it("should validate complete player object", () => {
      const player = createPlayer({ name: "John Doe", number: 10 });

      const result = PlayerSchema.parse(player);
      expect(result.id).toBe("player-1");
      expect(result.name).toBe("John Doe");
    });

    it("should accept player with minimal fields", () => {
      const player = createUnlinkedPlayer({
        id: "player-2",
        name: "Unlinked Player",
        teamId: undefined,
      });

      const result = PlayerSchema.parse(player);
      expect(result.id).toBe("player-2");
      expect(result.userId).toBeUndefined();
    });

    it("should reject missing required name", () => {
      const player = {
        id: "player-3",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => PlayerSchema.parse(player)).toThrow();
    });

    it("should reject missing id", () => {
      const player = {
        name: "Player",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => PlayerSchema.parse(player)).toThrow();
    });
  });
});
