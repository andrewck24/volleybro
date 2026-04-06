import type { Game, Substitution } from "@/entities/game";
import { EntryType, MoveType, Side } from "@/entities/game";
import { Position } from "@/entities/team";
import { createSubstitutionHelper } from "@/lib/features/game/helpers";

describe("substitution.helper.ts", () => {
  const mockSubstitution: Substitution = {
    team: Side.HOME,
    players: {
      in: "player-8", // Substitute player entering
      out: "player-1", // Starting player leaving
    },
  };

  const createMockGame = (): Game => ({
    id: "game-1",
    win: false,
    teamId: "team-1",
    info: {
      scoring: {
        setCount: 5,
        decidingSetPoints: 15,
      },
    },
    sets: [
      {
        win: false,
        lineups: {
          home: {
            options: {
              liberoReplaceMode: 0,
              liberoReplacePosition: Position.NONE,
            },
            starting: [
              { id: "player-1", position: Position.OH },
              { id: "player-2", position: Position.MB },
            ],
            liberos: [{ id: "player-7", position: Position.L }],
            substitutes: [{ id: "player-8", position: Position.OH }],
          },
          away: {
            options: {
              liberoReplaceMode: 0,
              liberoReplacePosition: Position.NONE,
            },
            starting: [{ id: "rival-1", position: Position.OH }],
            liberos: [],
            substitutes: [{ id: "rival-2", position: Position.OH }],
          },
        },
        entries: [
          {
            type: EntryType.RALLY,
            win: true,
            home: {
              score: 0,
              type: MoveType.SERVING,
              num: 1,
              player: { id: "player-1", zone: 1 },
            },
            away: {
              score: 0,
              type: MoveType.RECEPTION,
              num: 1,
              player: { id: "rival-1", zone: 1 },
            },
          },
        ],
        options: { serve: "home" },
      },
    ],
    teams: {
      home: {
        id: "team-1",
        name: "Home Team",
        players: [
          {
            id: "player-1",
            name: "Player 1",
            number: 1,
            stats: [
              {
                [MoveType.ATTACK]: { success: 0, error: 0 },
                [MoveType.SERVING]: { success: 1, error: 0 },
                [MoveType.BLOCKING]: { success: 0, error: 0 },
                [MoveType.RECEPTION]: { success: 0, error: 0 },
                [MoveType.DEFENSE]: { success: 0, error: 0 },
                [MoveType.SETTING]: { success: 0, error: 0 },
              },
            ],
          },
        ],
        staffs: [],
        stats: [
          {
            [MoveType.ATTACK]: { success: 0, error: 0 },
            [MoveType.SERVING]: { success: 1, error: 0 },
            [MoveType.BLOCKING]: { success: 0, error: 0 },
            [MoveType.RECEPTION]: { success: 0, error: 0 },
            [MoveType.DEFENSE]: { success: 0, error: 0 },
            [MoveType.SETTING]: { success: 0, error: 0 },
            [MoveType.UNFORCED]: { success: 0, error: 0 },
            rotation: 0,
            timeout: 2,
            substitution: 6,
            challenge: 2,
          },
        ],
      },
      away: {
        id: "team-2",
        name: "Away Team",
        players: [
          {
            id: "rival-1",
            name: "Rival 1",
            number: 1,
            stats: [
              {
                [MoveType.RECEPTION]: { success: 0, error: 1 },
                [MoveType.ATTACK]: { success: 0, error: 0 },
                [MoveType.SERVING]: { success: 0, error: 0 },
                [MoveType.BLOCKING]: { success: 0, error: 0 },
                [MoveType.DEFENSE]: { success: 0, error: 0 },
                [MoveType.SETTING]: { success: 0, error: 0 },
              },
            ],
          },
        ],
        staffs: [],
        stats: [
          {
            [MoveType.RECEPTION]: { success: 0, error: 1 },
            [MoveType.ATTACK]: { success: 0, error: 0 },
            [MoveType.SERVING]: { success: 0, error: 0 },
            [MoveType.BLOCKING]: { success: 0, error: 0 },
            [MoveType.DEFENSE]: { success: 0, error: 0 },
            [MoveType.SETTING]: { success: 0, error: 0 },
            [MoveType.UNFORCED]: { success: 0, error: 0 },
            rotation: 0,
            timeout: 2,
            substitution: 6,
            challenge: 2,
          },
        ],
      },
    },
  });

  describe("createSubstitutionOptimistic", () => {
    const mockParams = {
      gameId: "game-1",
      setIndex: 0,
      entryIndex: 1,
    };

    test("should create substitution entry at specified index", () => {
      const mockGame = createMockGame();

      const result = createSubstitutionHelper(
        mockParams,
        mockSubstitution,
        mockGame,
      );

      expect(result.sets[0].entries[1]).toEqual({
        type: EntryType.SUBSTITUTION,
        ...mockSubstitution,
      });
    });

    test("should update starting lineup with substitution player", () => {
      const mockGame = createMockGame();

      const result = createSubstitutionHelper(
        mockParams,
        mockSubstitution,
        mockGame,
      );

      // Check that the player in the starting lineup has been replaced
      const updatedStarting = result.sets[0].lineups.home.starting[0];
      expect(updatedStarting.id).toBe("player-8");
      expect(updatedStarting.position).toBe(Position.OH);
      expect(updatedStarting.sub!.id).toBe("player-1");
      expect(updatedStarting.sub!.entryIndex!.in).toBe(1);
      expect(updatedStarting.sub!.entryIndex!.out).toBeUndefined();
    });

    test("should update substitutes list with replaced player", () => {
      const mockGame = createMockGame();

      const result = createSubstitutionHelper(
        mockParams,
        mockSubstitution,
        mockGame,
      );

      // Check that the substitutes list now contains the player who left the court
      const updatedSub = result.sets[0].lineups.home.substitutes[0];
      expect(updatedSub.id).toBe("player-1");
      expect(updatedSub.position).toBe(Position.OH);
      expect(updatedSub.sub!.id).toBe("player-8");
      expect(updatedSub.sub!.entryIndex!.in).toBe(1);
      expect(updatedSub.sub!.entryIndex!.out).toBeUndefined();
    });

    test("should decrease team substitution count", () => {
      const mockGame = createMockGame();
      mockGame.teams.home.stats[0].substitution = 6;

      const result = createSubstitutionHelper(
        mockParams,
        mockSubstitution,
        mockGame,
      );

      expect(result.teams.home.stats[0].substitution).toBe(7);
    });

    test("should handle second substitution correctly", () => {
      const mockGame = createMockGame();

      // Assume a previous substitution has already occurred
      mockGame.sets[0].lineups.home.starting[0] = {
        id: "player-8",
        position: Position.OH,
        sub: {
          id: "player-1",
          entryIndex: {
            in: 1,
            out: undefined,
          },
        },
      };

      mockGame.sets[0].lineups.home.substitutes[0] = {
        id: "player-1",
        position: Position.OH,
        sub: {
          id: "player-8",
          entryIndex: {
            in: 1,
            out: undefined,
          },
        },
      };

      // Now perform a second substitution, original player returns to court
      const secondSubstitution: Substitution = {
        team: Side.HOME,
        players: {
          in: "player-1", // Original player returning to court
          out: "player-8", // Substitute player leaving
        },
      };

      const result = createSubstitutionHelper(
        { ...mockParams, entryIndex: 2 },
        secondSubstitution,
        mockGame,
      );

      // Check that the starting lineup is restored but with substitution history preserved
      const updatedStarting = result.sets[0].lineups.home.starting[0];
      expect(updatedStarting.id).toBe("player-1");
      expect(updatedStarting.sub!.id).toBe("player-8");
      expect(updatedStarting.sub!.entryIndex!.in).toBe(1);
      expect(updatedStarting.sub!.entryIndex!.out).toBe(2);
    });

    test("should handle away team substitution", () => {
      const mockGame = createMockGame();

      const awaySubstitution: Substitution = {
        team: Side.AWAY,
        players: {
          in: "rival-2",
          out: "rival-1",
        },
      };

      const result = createSubstitutionHelper(
        mockParams,
        awaySubstitution,
        mockGame,
      );

      // Check updates to the away team lineup
      const updatedStarting = result.sets[0].lineups.away!.starting[0];
      expect(updatedStarting.id).toBe("rival-2");
      expect(updatedStarting.sub!.id).toBe("rival-1");

      // Check that the away team substitution count is incremented
      expect(result.teams.away.stats[0].substitution).toBe(7);
    });
  });
});
