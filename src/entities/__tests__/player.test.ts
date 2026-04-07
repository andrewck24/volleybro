import { ValidationError } from "@/entities/errors/app-error";
import {
  Player,
  PlayerRole,
  PlayerStatus,
  canManageTeam,
  isOwner,
  validatePlayerStatus,
} from "@/entities/player";

const basePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: "player-1",
  name: "Test Player",
  status: PlayerStatus.NONE,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("Player Entity", () => {
  describe("validatePlayerStatus", () => {
    describe("NONE", () => {
      it("accepts player with no userId and no email", () => {
        expect(() =>
          validatePlayerStatus(basePlayer({ status: PlayerStatus.NONE })),
        ).not.toThrow();
      });

      it("rejects player with userId", () => {
        expect(() =>
          validatePlayerStatus(
            basePlayer({ status: PlayerStatus.NONE, userId: "user-1" }),
          ),
        ).toThrow(ValidationError);
      });

      it("rejects player with email", () => {
        expect(() =>
          validatePlayerStatus(
            basePlayer({
              status: PlayerStatus.NONE,
              email: "test@example.com",
            }),
          ),
        ).toThrow(ValidationError);
      });
    });

    describe("INVITED", () => {
      it("accepts player with userId only (registered user)", () => {
        expect(() =>
          validatePlayerStatus(
            basePlayer({
              status: PlayerStatus.INVITED,
              userId: "user-1",
              teamId: "team-1",
              role: PlayerRole.MEMBER,
            }),
          ),
        ).not.toThrow();
      });

      it("accepts player with email only (unregistered user)", () => {
        expect(() =>
          validatePlayerStatus(
            basePlayer({
              status: PlayerStatus.INVITED,
              email: "alice@example.com",
              teamId: "team-1",
              role: PlayerRole.MEMBER,
            }),
          ),
        ).not.toThrow();
      });

      it("rejects player with neither userId nor email", () => {
        expect(() =>
          validatePlayerStatus(
            basePlayer({
              status: PlayerStatus.INVITED,
              teamId: "team-1",
              role: PlayerRole.MEMBER,
            }),
          ),
        ).toThrow(ValidationError);
      });

      it("rejects player with both userId and email", () => {
        expect(() =>
          validatePlayerStatus(
            basePlayer({
              status: PlayerStatus.INVITED,
              userId: "user-1",
              email: "alice@example.com",
              teamId: "team-1",
              role: PlayerRole.MEMBER,
            }),
          ),
        ).toThrow(ValidationError);
      });
    });

    describe("JOINED", () => {
      it("accepts player with userId", () => {
        expect(() =>
          validatePlayerStatus(
            basePlayer({
              status: PlayerStatus.JOINED,
              userId: "user-1",
              teamId: "team-1",
              role: PlayerRole.MEMBER,
            }),
          ),
        ).not.toThrow();
      });

      it("rejects player without userId", () => {
        expect(() =>
          validatePlayerStatus(
            basePlayer({
              status: PlayerStatus.JOINED,
              teamId: "team-1",
              role: PlayerRole.MEMBER,
            }),
          ),
        ).toThrow(ValidationError);
      });

      it("rejects player with email present", () => {
        expect(() =>
          validatePlayerStatus(
            basePlayer({
              status: PlayerStatus.JOINED,
              userId: "user-1",
              email: "alice@example.com",
              teamId: "team-1",
              role: PlayerRole.MEMBER,
            }),
          ),
        ).toThrow(ValidationError);
      });
    });
  });

  describe("canManageTeam", () => {
    it("returns true for OWNER", () => {
      expect(canManageTeam(basePlayer({ role: PlayerRole.OWNER }))).toBe(true);
    });

    it("returns true for ADMIN", () => {
      expect(canManageTeam(basePlayer({ role: PlayerRole.ADMIN }))).toBe(true);
    });

    it("returns false for MEMBER", () => {
      expect(canManageTeam(basePlayer({ role: PlayerRole.MEMBER }))).toBe(
        false,
      );
    });

    it("returns false when role is undefined", () => {
      expect(canManageTeam(basePlayer())).toBe(false);
    });
  });

  describe("isOwner", () => {
    it("returns true for OWNER", () => {
      expect(isOwner(basePlayer({ role: PlayerRole.OWNER }))).toBe(true);
    });

    it("returns false for ADMIN", () => {
      expect(isOwner(basePlayer({ role: PlayerRole.ADMIN }))).toBe(false);
    });

    it("returns false for MEMBER", () => {
      expect(isOwner(basePlayer({ role: PlayerRole.MEMBER }))).toBe(false);
    });

    it("returns false when role is undefined", () => {
      expect(isOwner(basePlayer())).toBe(false);
    });
  });
});
