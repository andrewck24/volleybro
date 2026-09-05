import { EntryType, MoveType as M, type EntryIdentity } from "@/entities/game";
import { Position } from "@/entities/team";
import {
  applyEntry,
  assertRallyAt,
  deriveEntryPhase,
} from "@/lib/features/game/helpers";
import type { GameView, RallyView } from "@/lib/features/game/types";

// What useSubmitEntryDraft runs per rally, collapsed onto one game.
const record = (
  { setIndex, entryIndex }: { setIndex: number; entryIndex: number },
  draft: RallyView & EntryIdentity,
  game: GameView,
) => {
  const phase = deriveEntryPhase(game, setIndex, entryIndex, draft);
  return { phase, game: applyEntry(game, setIndex, draft, phase) };
};

describe("rally.helper.ts", () => {
  const mockRally: RallyView & EntryIdentity = {
    id: "entry-mock",
    seq: 1,
    win: true,
    home: {
      score: 1,
      type: M.ATTACK,
      num: 1,
      player: { id: "player-1", zone: 1 },
    },
    away: {
      score: 0,
      type: M.DEFENSE,
      num: 1,
      player: { id: "rival-1", zone: 1 },
    },
  };

  const createMockGame = (): GameView => ({
    id: "game-1",
    win: null,
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
            id: "entry-0",
            seq: 0,
            win: true,
            home: {
              score: 0,
              type: M.SERVING,
              num: 1,
              player: { id: "player-1", zone: 1 },
            },
            away: {
              score: 0,
              type: M.RECEPTION,
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
        players: [{ id: "player-1", name: "Player 1", number: 1 }],
        staffs: [],
      },
      away: {
        id: "team-2",
        name: "Away Team",
        players: [{ id: "rival-1", name: "Rival 1", number: 1 }],
        staffs: [],
      },
    },
  });

  describe("createRallyOptimistic", () => {
    const mockParams = {
      setIndex: 0,
      entryIndex: 1,
    };

    it("should create new rally entry at specified index", () => {
      const mockGame = createMockGame();

      const result = record(mockParams, mockRally, mockGame);

      expect(result.game.sets[0]!.entries[1]).toEqual({
        type: EntryType.RALLY,
        ...mockRally,
      });
    });

    it("should not mutate the game passed in", () => {
      const mockGame = createMockGame();
      const before = JSON.parse(JSON.stringify(mockGame));

      const result = record(mockParams, mockRally, mockGame);

      expect(mockGame).toEqual(before);
      expect(result.game).not.toBe(mockGame);
    });
  });

  describe("updateRallyOptimistic", () => {
    const mockParams = {
      setIndex: 0,
      entryIndex: 0,
    };

    const newRally: RallyView & EntryIdentity = {
      id: "entry-0",
      seq: 0,
      win: true,
      home: {
        score: 1,
        type: M.ATTACK, // Changed from SERVING to ATTACK
        num: 1,
        player: { id: "player-1", zone: 1 },
      },
      away: {
        score: 0,
        type: M.DEFENSE, // Changed from RECEPTION to DEFENSE
        num: 1,
        player: { id: "rival-1", zone: 1 },
      },
    };

    it("should update existing rally entry with new data", () => {
      const mockGame = createMockGame();

      const result = record(mockParams, newRally, mockGame);

      expect(result.game.sets[0]!.entries[0]).toEqual({
        type: EntryType.RALLY,
        ...newRally,
      });
    });

    it("should throw error when entry is not a rally", () => {
      const mockGame = createMockGame();
      mockGame.sets[0]!.entries[0]!.type = EntryType.TIMEOUT;

      expect(() => {
        assertRallyAt(mockGame, mockParams.setIndex, mockParams.entryIndex);
      }).toThrow("Entry is not a rally");
    });

    it("should not mutate the game passed in", () => {
      const mockGame = createMockGame();
      const before = JSON.parse(JSON.stringify(mockGame));

      const result = record(mockParams, newRally, mockGame);

      expect(mockGame).toEqual(before);
      expect(result.game).not.toBe(mockGame);
    });
  });

  describe("processGamePhase logic", () => {
    describe("set completion", () => {
      it("should mark the set as not completed when scores are below winning threshold", () => {
        const mockGame = createMockGame();
        const mockRallyLowScore = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 20 },
          away: { ...mockRally.away, score: 18 },
        };

        const result = record(
          { setIndex: 0, entryIndex: 1 },
          mockRallyLowScore,
          mockGame,
        );

        expect(result.phase.isSetInProgress).toBe(true);
        expect(result.phase.isSetPoint).toBe(false);
        expect(result.game.sets[0]!.win).toBeFalsy(); // 不應該設定勝負
      });

      it("should mark the set as completed when home team reaches winning score with 2-point lead", () => {
        const mockGame = createMockGame();
        const mockRallyHomeWin = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 25 },
          away: { ...mockRally.away, score: 23 },
        };

        const result = record(
          { setIndex: 0, entryIndex: 1 },
          mockRallyHomeWin,
          mockGame,
        );

        expect(result.phase.isSetInProgress).toBe(false);
        expect(result.game.sets[0]!.win).toBe(true); // 主隊贏了這局
      });

      it("should mark the set as completed when away team reaches winning score with 2-point lead", () => {
        const mockGame = createMockGame();
        const mockRallyAwayWin = {
          ...mockRally,
          win: false,
          home: { ...mockRally.home, score: 23 },
          away: { ...mockRally.away, score: 25 },
        };

        const result = record(
          { setIndex: 0, entryIndex: 1 },
          mockRallyAwayWin,
          mockGame,
        );

        expect(result.phase.isSetInProgress).toBe(false);
        expect(result.game.sets[0]!.win).toBe(false); // 客隊贏了這局
      });

      it("should detect a set point correctly", () => {
        const mockGame = createMockGame();
        const mockRallySetPoint = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 24 },
          away: { ...mockRally.away, score: 22 },
        };

        const result = record(
          { setIndex: 0, entryIndex: 1 },
          mockRallySetPoint,
          mockGame,
        );

        expect(result.phase.isSetInProgress).toBe(true);
        expect(result.phase.isSetPoint).toBe(true);
      });

      it("should use different winning score for deciding set", () => {
        const mockGame = createMockGame();
        mockGame.sets[0]!.win = true;
        mockGame.sets.push({ ...mockGame.sets[0]!, win: false }); // 1-1
        mockGame.sets.push({ ...mockGame.sets[0]!, win: true }); // 2-1
        mockGame.sets.push({ ...mockGame.sets[0]!, win: false }); // 2-2
        mockGame.sets.push({
          ...mockGame.sets[0]!,
          entries: [],
        });

        const fifthSet = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 15 },
          away: { ...mockRally.away, score: 13 },
        };

        const result = record(
          { setIndex: 4, entryIndex: 0 },
          fifthSet,
          mockGame,
        );

        expect(result.phase.isSetInProgress).toBe(false);
        expect(result.game.sets[4]!.win).toBe(true); // 主隊贏了決勝局
      });
    });

    describe("game completion", () => {
      it("should mark the game as completed when a team wins majority of sets (3-0)", () => {
        const mockGame = createMockGame();
        mockGame.sets[0]!.win = true;
        mockGame.sets.push({ ...mockGame.sets[0]!, win: true });
        mockGame.sets.push({
          ...mockGame.sets[0]!,
          entries: [],
        });

        const thirdSetWin = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 25 },
          away: { ...mockRally.away, score: 20 },
        };

        const result = record(
          { setIndex: 2, entryIndex: 0 },
          thirdSetWin,
          mockGame,
        );

        expect(result.phase.isSetInProgress).toBe(false);
        expect(result.game.sets[2]!.win).toBe(true);
        expect(result.game.win).toBe(true); // 主隊贏了比賽
      });

      it("should mark the game as completed when a team wins majority of sets (2-3)", () => {
        const mockGame = createMockGame();
        mockGame.sets[0]!.win = true;
        mockGame.sets.push({ ...mockGame.sets[0]!, win: false });
        mockGame.sets.push({ ...mockGame.sets[0]!, win: true });
        mockGame.sets.push({ ...mockGame.sets[0]!, win: false });
        mockGame.sets.push({
          ...mockGame.sets[0]!,
          entries: [],
        });

        const fifthSetLoss = {
          ...mockRally,
          win: false,
          home: { ...mockRally.home, score: 13 },
          away: { ...mockRally.away, score: 15 },
        };

        const result = record(
          { setIndex: 4, entryIndex: 0 },
          fifthSetLoss,
          mockGame,
        );

        expect(result.phase.isSetInProgress).toBe(false);
        expect(result.game.sets[4]!.win).toBe(false);
        expect(result.game.win).toBe(false); // 客隊贏了比賽
      });

      it("should not mark the game as completed when no team has won majority of sets yet (2-1)", () => {
        const mockGame = createMockGame();
        mockGame.sets[0]!.win = true;
        mockGame.sets.push({ ...mockGame.sets[0]!, win: false });
        mockGame.sets.push({ ...mockGame.sets[0]!, win: true });
        mockGame.sets.push({
          ...mockGame.sets[0]!,
          entries: [],
        });

        const fourthSet = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 10 },
          away: { ...mockRally.away, score: 5 },
        };

        const result = record(
          { setIndex: 3, entryIndex: 0 },
          fourthSet,
          mockGame,
        );

        expect(result.phase.isSetInProgress).toBe(true);
        expect(result.game.win).toBeNull(); // 比賽還沒結束
      });
    });

    describe("when updating rally", () => {
      it("should recalculate set and game status when rally is updated", () => {
        const mockGame = createMockGame();
        const winningRally = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 25 },
          away: { ...mockRally.away, score: 23 },
        };

        mockGame.sets[0]!.entries[0] = {
          type: EntryType.RALLY,
          ...winningRally,
        };
        mockGame.sets[0]!.win = true; // 已經標記為主隊勝

        const updatedRally = {
          ...winningRally,
          win: false,
          home: { ...winningRally.home, score: 23 },
          away: { ...winningRally.away, score: 25 },
        };

        const result = record(
          { setIndex: 0, entryIndex: 0 },
          updatedRally,
          mockGame,
        );

        expect(result.phase.isSetInProgress).toBe(false);
        expect(result.phase.isSetPoint).toBe(false);
        expect(result.game.sets[0]!.win).toBe(false);
      });
    });
  });
});
