import {
  MoveType,
  PlayerStatsClass,
  SET_ALLOWANCES,
  TeamStatsClass,
  deriveSetStats,
} from "@/entities/game";
import { Position } from "@/entities/team";
import { createRallyHelper } from "@/lib/features/game/helpers";
import type { GameView, RallyView } from "@/lib/features/game/types";

/**
 * The derivation replaces per-rally accumulation, so the two must agree. If this
 * ever fails, the recording page and every stored total disagree about the same
 * match.
 */
describe("deriveSetStats matches per-rally accumulation", () => {
  const PLAYERS = ["p1", "p2"];

  const emptyGame = (): GameView =>
    ({
      id: "game-1",
      win: null,
      teamId: "team-1",
      info: { scoring: { setCount: 5, decidingSetPoints: 15 } },
      teams: {
        home: {
          id: "home",
          name: "Home",
          players: PLAYERS.map((id, i) => ({
            id,
            name: id,
            number: i + 1,
            stats: [new PlayerStatsClass()],
          })),
          staffs: [],
          stats: [new TeamStatsClass()],
        },
        away: {
          id: "away",
          name: "Away",
          players: [],
          staffs: [],
          stats: [new TeamStatsClass()],
        },
      },
      sets: [
        {
          win: null,
          lineups: {
            home: {
              options: {
                liberoReplaceMode: 0,
                liberoReplacePosition: Position.NONE,
              },
              starting: [],
              liberos: [],
              substitutes: [],
            },
          },
          options: { serve: "home" },
          entries: [],
        },
      ],
    }) as unknown as GameView;

  const rally = (
    win: boolean,
    home: number,
    away: number,
    scorer: string | undefined,
    type: MoveType,
  ): RallyView =>
    ({
      win,
      home: {
        score: home,
        type,
        num: 1,
        ...(scorer ? { player: { id: scorer, zone: 1 } } : {}),
      },
      away: { score: away, type: MoveType.DEFENSE, num: 1 },
    }) as RallyView;

  it("agrees on team totals, player totals and rotation", () => {
    const script: RallyView[] = [
      rally(true, 1, 0, "p1", MoveType.ATTACK),
      rally(false, 1, 1, "p2", MoveType.SERVING),
      rally(true, 2, 1, "p1", MoveType.BLOCKING),
      rally(true, 3, 1, undefined, MoveType.UNFORCED),
      rally(false, 3, 2, "p2", MoveType.RECEPTION),
      rally(true, 4, 2, "p2", MoveType.ATTACK),
    ];

    const game = emptyGame();
    script.forEach((draft, entryIndex) => {
      createRallyHelper(
        { gameId: "game-1", setIndex: 0, entryIndex },
        draft,
        game,
      );
    });

    const set = game.sets[0]!;
    const derived = deriveSetStats(set.entries, { options: set.options });

    // The move counters and rotation must match exactly. The three allowance
    // fields deliberately do not: accumulation seeds them with the rule limits
    // and counts down, derivation counts what was used and starts at zero.
    const moveCounters = (stats: TeamStatsClass) => ({
      [MoveType.SERVING]: stats[MoveType.SERVING],
      [MoveType.BLOCKING]: stats[MoveType.BLOCKING],
      [MoveType.ATTACK]: stats[MoveType.ATTACK],
      [MoveType.RECEPTION]: stats[MoveType.RECEPTION],
      [MoveType.DEFENSE]: stats[MoveType.DEFENSE],
      [MoveType.SETTING]: stats[MoveType.SETTING],
      [MoveType.UNFORCED]: stats[MoveType.UNFORCED],
      rotation: stats.rotation,
    });

    expect(moveCounters(derived.home)).toEqual(
      moveCounters(game.teams.home.stats[0] as TeamStatsClass),
    );
    expect(moveCounters(derived.away)).toEqual(
      moveCounters(game.teams.away.stats[0] as TeamStatsClass),
    );

    expect(derived.home.substitution).toBe(0);
    expect(game.teams.home.stats[0]!.substitution).toBe(
      SET_ALLOWANCES.substitution,
    );

    for (const id of PLAYERS) {
      const accumulated = game.teams.home.players.find((p) => p.id === id)!
        .stats[0];
      expect(derived.players[id] ?? new PlayerStatsClass()).toEqual(
        accumulated,
      );
    }
  });
});
