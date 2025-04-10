import {
  createRallyHelper,
  updateRallyHelper,
} from "@/lib/features/record/helpers";
import { Position } from "@/entities/team";
import { EntryType, MoveType as M } from "@/entities/record";
import type { Rally, Record } from "@/entities/record";

describe("rally.helper.ts", () => {
  const mockRally: Rally = {
    win: true,
    home: {
      score: 1,
      type: M.ATTACK,
      num: 1,
      player: { _id: "player-1", zone: 1 },
    },
    away: {
      score: 0,
      type: M.DEFENSE,
      num: 1,
      player: { _id: "rival-1", zone: 1 },
    },
  };

  const createMockRecord = (): Record => ({
    _id: "record-1",
    win: null,
    team_id: "team-1",
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
              { _id: "player-1", position: Position.OH },
              { _id: "player-2", position: Position.MB },
            ],
            liberos: [{ _id: "player-7", position: Position.L }],
            substitutes: [{ _id: "player-8", position: Position.OH }],
          },
          away: {
            options: {
              liberoReplaceMode: 0,
              liberoReplacePosition: Position.NONE,
            },
            starting: [{ _id: "rival-1", position: Position.OH }],
            liberos: [],
            substitutes: [{ _id: "rival-2", position: Position.OH }],
          },
        },
        entries: [
          {
            type: EntryType.RALLY,
            data: {
              win: true,
              home: {
                score: 0,
                type: M.SERVING,
                num: 1,
                player: { _id: "player-1", zone: 1 },
              },
              away: {
                score: 0,
                type: M.RECEPTION,
                num: 1,
                player: { _id: "rival-1", zone: 1 },
              },
            },
          },
        ],
        options: { serve: "home" },
      },
    ],
    teams: {
      home: {
        _id: "team-1",
        name: "Home Team",
        players: [
          {
            _id: "player-1",
            name: "Player 1",
            number: 1,
            stats: [
              {
                [M.ATTACK]: { success: 0, error: 0 },
                [M.SERVING]: { success: 1, error: 0 },
                [M.BLOCKING]: { success: 0, error: 0 },
                [M.RECEPTION]: { success: 0, error: 0 },
                [M.DEFENSE]: { success: 0, error: 0 },
                [M.SETTING]: { success: 0, error: 0 },
              },
            ],
          },
        ],
        staffs: [],
        stats: [
          {
            [M.ATTACK]: { success: 0, error: 0 },
            [M.SERVING]: { success: 1, error: 0 },
            [M.BLOCKING]: { success: 0, error: 0 },
            [M.RECEPTION]: { success: 0, error: 0 },
            [M.DEFENSE]: { success: 0, error: 0 },
            [M.SETTING]: { success: 0, error: 0 },
            [M.UNFORCED]: { success: 0, error: 0 },
            rotation: 0,
            timeout: 2,
            substitution: 6,
            challenge: 2,
          },
        ],
      },
      away: {
        _id: "team-2",
        name: "Away Team",
        players: [
          {
            _id: "rival-1",
            name: "Rival 1",
            number: 1,
            stats: [
              {
                [M.RECEPTION]: { success: 0, error: 1 },
                [M.ATTACK]: { success: 0, error: 0 },
                [M.SERVING]: { success: 0, error: 0 },
                [M.BLOCKING]: { success: 0, error: 0 },
                [M.DEFENSE]: { success: 0, error: 0 },
                [M.SETTING]: { success: 0, error: 0 },
              },
            ],
          },
        ],
        staffs: [],
        stats: [
          {
            [M.RECEPTION]: { success: 0, error: 1 },
            [M.ATTACK]: { success: 0, error: 0 },
            [M.SERVING]: { success: 0, error: 0 },
            [M.BLOCKING]: { success: 0, error: 0 },
            [M.DEFENSE]: { success: 0, error: 0 },
            [M.SETTING]: { success: 0, error: 0 },
            [M.UNFORCED]: { success: 0, error: 0 },
            rotation: 0,
            timeout: 2,
            substitution: 6,
            challenge: 2,
          },
        ],
      },
    },
  });

  describe("createRallyOptimistic", () => {
    const mockParams = {
      recordId: "record-1",
      setIndex: 0,
      entryIndex: 1,
    };

    it("should create new rally entry at specified index", () => {
      const mockRecord = createMockRecord();

      const result = createRallyHelper(mockParams, mockRally, mockRecord);

      expect(result.record.sets[0].entries[1]).toEqual({
        type: EntryType.RALLY,
        data: mockRally,
      });
    });

    it("should update player stats when home team wins", () => {
      const mockRecord = createMockRecord();
      const result = createRallyHelper(mockParams, mockRally, mockRecord);

      expect(
        result.record.teams.home.players[0].stats[0][M.ATTACK].success
      ).toBe(1);
    });

    it("should update team stats when home team wins", () => {
      const mockRecord = createMockRecord();

      const result = createRallyHelper(mockParams, mockRally, mockRecord);

      expect(result.record.teams.home.stats[0][M.ATTACK].success).toBe(1);
      expect(result.record.teams.away.stats[0][M.DEFENSE].error).toBe(1);
    });

    it("should update rotation when winning and the last rally is lost", () => {
      const mockRecord = createMockRecord();

      // add a lost rally before the winning rally for rotation
      (mockRecord.sets[0].entries[0].data as Rally).win = false;

      const result = createRallyHelper(mockParams, mockRally, mockRecord);

      expect(result.record.teams.home.stats[0].rotation).toBe(1);
    });

    it("should not update rotation when winning serving team", () => {
      const mockRecord = createMockRecord();

      // Set home team as serving team
      mockRecord.sets[0].options.serve = "home";

      const result = createRallyHelper(mockParams, mockRally, mockRecord);

      expect(result.record.teams.home.stats[0].rotation).toBe(0);
    });
  });

  describe("updateRallyOptimistic", () => {
    const mockParams = {
      recordId: "record-1",
      setIndex: 0,
      entryIndex: 0,
    };

    const newRally: Rally = {
      win: true,
      home: {
        score: 1,
        type: M.ATTACK, // Changed from SERVING to ATTACK
        num: 1,
        player: { _id: "player-1", zone: 1 },
      },
      away: {
        score: 0,
        type: M.DEFENSE, // Changed from RECEPTION to DEFENSE
        num: 1,
        player: { _id: "rival-1", zone: 1 },
      },
    };

    it("should update existing rally entry with new data", () => {
      const mockRecord = createMockRecord();

      const result = updateRallyHelper(mockParams, newRally, mockRecord);

      expect(result.record.sets[0].entries[0]).toEqual({
        type: EntryType.RALLY,
        data: newRally,
      });
    });

    it("should update player and team stats when rally details change", () => {
      const mockRecord = createMockRecord();

      const result = updateRallyHelper(mockParams, newRally, mockRecord);

      // Original stats should be removed
      expect(
        result.record.teams.home.players[0].stats[0][M.ATTACK].success
      ).toBe(1);

      // New stats should be added
      expect(
        result.record.teams.home.players[0].stats[0][M.SERVING].success
      ).toBe(0);

      // Team stats should also be updated
      expect(result.record.teams.home.stats[0][M.SERVING].success).toBe(0);
      expect(result.record.teams.away.stats[0][M.RECEPTION].error).toBe(0);
      expect(result.record.teams.home.stats[0][M.ATTACK].success).toBe(1);
      expect(result.record.teams.away.stats[0][M.DEFENSE].error).toBe(1);
    });

    it("should update player and team stats when changing a rally from lost to won", () => {
      const mockRecord = createMockRecord();
      const mockParams = { recordId: "record-1", setIndex: 0, entryIndex: 1 };
      const lostRally: Rally = {
        win: false,
        home: {
          score: 1,
          type: M.ATTACK,
          num: 1,
          player: { _id: "player-1", zone: 1 },
        },
        away: {
          score: 1,
          type: M.BLOCKING,
          num: 1,
          player: { _id: "rival-1", zone: 1 },
        },
      };
      createRallyHelper(mockParams, lostRally, mockRecord);

      // Change the first rally from lost to win
      const result = updateRallyHelper(mockParams, newRally, mockRecord);

      // Original stats should be removed
      expect(result.record.teams.home.players[0].stats[0][M.ATTACK].error).toBe(
        0
      );

      // New stats should be added
      expect(
        result.record.teams.home.players[0].stats[0][M.ATTACK].success
      ).toBe(1);

      // Team stats should also be updated
      expect(result.record.teams.home.stats[0][M.ATTACK].error).toBe(0);
      expect(result.record.teams.away.stats[0][M.BLOCKING].success).toBe(0);
      expect(result.record.teams.home.stats[0][M.ATTACK].success).toBe(1);
      expect(result.record.teams.away.stats[0][M.DEFENSE].error).toBe(1);
    });

    it("should throw error when entry is not a rally", () => {
      const mockRecord = createMockRecord();
      mockRecord.sets[0].entries[0].type = EntryType.TIMEOUT;

      expect(() => {
        updateRallyHelper(mockParams, newRally, mockRecord);
      }).toThrow("Entry is not a rally");
    });

    it("should update rotation when rally win status changes", () => {
      const mockRecord = createMockRecord();
      // Add a second rally so we can see rotation change
      mockRecord.sets[0].entries.push({
        type: EntryType.RALLY,
        data: {
          win: true,
          home: {
            score: 2,
            type: M.ATTACK,
            num: 1,
            player: { _id: "player-1", zone: 1 },
          },
          away: {
            score: 0,
            type: M.DEFENSE,
            num: 1,
            player: { _id: "rival-1", zone: 1 },
          },
        },
      });

      // Change the first rally from win to loss
      const newRally: Rally = {
        win: false, // Changed from true to false
        home: {
          score: 0,
          type: M.ATTACK,
          num: 1,
          player: { _id: "player-1", zone: 1 },
        },
        away: {
          score: 1,
          type: M.BLOCKING,
          num: 1,
          player: { _id: "rival-1", zone: 1 },
        },
      };

      const result = updateRallyHelper(mockParams, newRally, mockRecord);

      // Rotation should be updated since we've changed win status
      expect(result.record.teams.home.stats[0].rotation).toBe(1);
    });

    it("should not change rotation when win status remains the same", () => {
      const mockRecord = createMockRecord();

      const result = updateRallyHelper(mockParams, newRally, mockRecord);

      // Rotation should remain unchanged
      expect(result.record.teams.home.stats[0].rotation).toBe(0);
    });
  });

  describe("processMatchPhase logic", () => {
    describe("set completion", () => {
      it("should mark the set as not completed when scores are below winning threshold", () => {
        const mockRecord = createMockRecord();
        const mockRallyLowScore: Rally = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 20 },
          away: { ...mockRally.away, score: 18 },
        };

        const result = createRallyHelper(
          { recordId: "record-1", setIndex: 0, entryIndex: 1 },
          mockRallyLowScore,
          mockRecord
        );

        expect(result.phase.inProgress).toBe(true);
        expect(result.phase.isSetPoint).toBe(false);
        expect(result.record.sets[0].win).toBeFalsy(); // 不應該設定勝負
      });

      it("should mark the set as completed when home team reaches winning score with 2-point lead", () => {
        const mockRecord = createMockRecord();
        // 建立25-23得分情境
        const mockRallyHomeWin: Rally = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 25 },
          away: { ...mockRally.away, score: 23 },
        };

        const result = createRallyHelper(
          { recordId: "record-1", setIndex: 0, entryIndex: 1 },
          mockRallyHomeWin,
          mockRecord
        );

        expect(result.phase.inProgress).toBe(false);
        expect(result.record.sets[0].win).toBe(true); // 主隊贏了這局
      });

      it("should mark the set as completed when away team reaches winning score with 2-point lead", () => {
        const mockRecord = createMockRecord();
        // 建立23-25得分情境
        const mockRallyAwayWin: Rally = {
          ...mockRally,
          win: false,
          home: { ...mockRally.home, score: 23 },
          away: { ...mockRally.away, score: 25 },
        };

        const result = createRallyHelper(
          { recordId: "record-1", setIndex: 0, entryIndex: 1 },
          mockRallyAwayWin,
          mockRecord
        );

        expect(result.phase.inProgress).toBe(false);
        expect(result.record.sets[0].win).toBe(false); // 客隊贏了這局
      });

      it("should detect a set point correctly", () => {
        const mockRecord = createMockRecord();
        // 建立24-22得分情境 (set point)
        const mockRallySetPoint: Rally = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 24 },
          away: { ...mockRally.away, score: 22 },
        };

        const result = createRallyHelper(
          { recordId: "record-1", setIndex: 0, entryIndex: 1 },
          mockRallySetPoint,
          mockRecord
        );

        expect(result.phase.inProgress).toBe(true);
        expect(result.phase.isSetPoint).toBe(true);
      });

      it("should use different winning score for deciding set", () => {
        const mockRecord = createMockRecord();
        mockRecord.sets[0].win = true;
        mockRecord.sets.push({ ...mockRecord.sets[0], win: false }); // 1-1
        mockRecord.sets.push({ ...mockRecord.sets[0], win: true }); // 2-1
        mockRecord.sets.push({ ...mockRecord.sets[0], win: false }); // 2-2
        mockRecord.sets.push({
          ...mockRecord.sets[0],
          entries: [],
        });

        // 決勝局主隊15-13獲勝
        const fifthSet: Rally = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 15 },
          away: { ...mockRally.away, score: 13 },
        };

        // 添加決勝局的統計數據
        mockRecord.teams.home.stats[4] = mockRecord.teams.home.stats[0];
        mockRecord.teams.away.stats[4] = mockRecord.teams.away.stats[0];
        mockRecord.teams.home.players[0].stats[4] =
          mockRecord.teams.home.players[0].stats[0];

        const result = createRallyHelper(
          { recordId: "record-1", setIndex: 4, entryIndex: 0 },
          fifthSet,
          mockRecord
        );

        expect(result.phase.inProgress).toBe(false);
        expect(result.record.sets[4].win).toBe(true); // 主隊贏了決勝局
      });
    });

    describe("match completion", () => {
      it("should mark the match as completed when a team wins majority of sets (3-0)", () => {
        const mockRecord = createMockRecord();
        // 已經有兩局主隊獲勝
        mockRecord.sets[0].win = true;
        mockRecord.sets.push({ ...mockRecord.sets[0], win: true });
        mockRecord.sets.push({
          ...mockRecord.sets[0],
          entries: [],
        });

        // 主隊第三局獲勝 25-20
        const thirdSetWin: Rally = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 25 },
          away: { ...mockRally.away, score: 20 },
        };

        // 添加第三局統計數據
        mockRecord.teams.home.stats[2] = mockRecord.teams.home.stats[0];
        mockRecord.teams.away.stats[2] = mockRecord.teams.away.stats[0];
        mockRecord.teams.home.players[0].stats[2] =
          mockRecord.teams.home.players[0].stats[0];

        const result = createRallyHelper(
          { recordId: "record-1", setIndex: 2, entryIndex: 0 },
          thirdSetWin,
          mockRecord
        );

        expect(result.phase.inProgress).toBe(false);
        expect(result.record.sets[2].win).toBe(true);
        expect(result.record.win).toBe(true); // 主隊贏了比賽
      });

      it("should mark the match as completed when a team wins majority of sets (2-3)", () => {
        const mockRecord = createMockRecord();
        // 2-2平局狀態
        mockRecord.sets[0].win = true;
        mockRecord.sets.push({ ...mockRecord.sets[0], win: false });
        mockRecord.sets.push({ ...mockRecord.sets[0], win: true });
        mockRecord.sets.push({ ...mockRecord.sets[0], win: false });
        mockRecord.sets.push({
          ...mockRecord.sets[0],
          entries: [],
        });

        // 客隊決勝局獲勝 13-15
        const fifthSetLoss: Rally = {
          ...mockRally,
          win: false,
          home: { ...mockRally.home, score: 13 },
          away: { ...mockRally.away, score: 15 },
        };

        // 添加決勝局統計數據
        mockRecord.teams.home.stats[4] = mockRecord.teams.home.stats[0];
        mockRecord.teams.away.stats[4] = mockRecord.teams.away.stats[0];
        mockRecord.teams.home.players[0].stats[4] =
          mockRecord.teams.home.players[0].stats[0];

        const result = createRallyHelper(
          { recordId: "record-1", setIndex: 4, entryIndex: 0 },
          fifthSetLoss,
          mockRecord
        );

        expect(result.phase.inProgress).toBe(false);
        expect(result.record.sets[4].win).toBe(false);
        expect(result.record.win).toBe(false); // 客隊贏了比賽
      });

      it("should not mark the match as completed when no team has won majority of sets yet (2-1)", () => {
        const mockRecord = createMockRecord();
        // 2-1領先狀態
        mockRecord.sets[0].win = true;
        mockRecord.sets.push({ ...mockRecord.sets[0], win: false });
        mockRecord.sets.push({ ...mockRecord.sets[0], win: true });
        mockRecord.sets.push({
          ...mockRecord.sets[0],
          entries: [],
        });

        // 主隊獲勝這球但比賽未結束
        const fourthSet: Rally = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 10 },
          away: { ...mockRally.away, score: 5 },
        };

        // 添加第四局統計數據
        mockRecord.teams.home.stats[3] = mockRecord.teams.home.stats[0];
        mockRecord.teams.away.stats[3] = mockRecord.teams.away.stats[0];
        mockRecord.teams.home.players[0].stats[3] =
          mockRecord.teams.home.players[0].stats[0];

        const result = createRallyHelper(
          { recordId: "record-1", setIndex: 3, entryIndex: 0 },
          fourthSet,
          mockRecord
        );

        expect(result.phase.inProgress).toBe(true);
        expect(result.record.win).toBeNull(); // 比賽還沒結束
      });
    });

    // 測試更新賽事紀錄時的邏輯
    describe("when updating rally", () => {
      it("should recalculate set and match status when rally is updated", () => {
        const mockRecord = createMockRecord();
        // 先增加一個決勝得分的記錄
        const winningRally: Rally = {
          ...mockRally,
          win: true,
          home: { ...mockRally.home, score: 25 },
          away: { ...mockRally.away, score: 23 },
        };

        mockRecord.sets[0].entries[0] = {
          type: EntryType.RALLY,
          data: winningRally,
        };
        mockRecord.sets[0].win = true; // 已經標記為主隊勝

        // 修改這個記錄，改為客隊贏
        const updatedRally: Rally = {
          ...winningRally,
          win: false,
          home: { ...winningRally.home, score: 23 },
          away: { ...winningRally.away, score: 25 },
        };

        const result = updateRallyHelper(
          { recordId: "record-1", setIndex: 0, entryIndex: 0 },
          updatedRally,
          mockRecord
        );

        expect(result.phase.inProgress).toBe(false);
        expect(result.phase.isSetPoint).toBe(false);
        expect(result.record.sets[0].win).toBe(false);
      });
    });
  });
});
