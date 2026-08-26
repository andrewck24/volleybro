import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import {
  deriveSetStats,
  EntryType,
  MoveType,
  type Game,
} from "@/entities/game";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { lineupFor, oid } from "./support/seed";

/**
 * A document written before this Change could carry a `stats` array whose
 * values disagree with its own entries — the stored counters were never
 * reliably kept in step (see decision D1). The repository read path must
 * still map such a document cleanly, and derivation must use the entries,
 * not the stale field.
 */
describe("games recorded before stats were retired", () => {
  const repo = () => container.get<IGameRepository>(TYPES.GameRepository);

  it("derives correct totals from entries even when the stored stats field disagrees", async () => {
    const teamId = oid();
    const playerIds = Array.from({ length: 6 }, oid);
    const lineup = lineupFor(playerIds);

    const staleTeamStats = [
      {
        [MoveType.SERVING]: { success: 999, error: 999 },
        [MoveType.BLOCKING]: { success: 999, error: 999 },
        [MoveType.ATTACK]: { success: 999, error: 999 },
        [MoveType.RECEPTION]: { success: 999, error: 999 },
        [MoveType.DEFENSE]: { success: 999, error: 999 },
        [MoveType.SETTING]: { success: 999, error: 999 },
        [MoveType.UNFORCED]: { success: 999, error: 999 },
        rotation: 99,
        timeout: 99,
        substitution: 99,
        challenge: 99,
      },
    ];

    const game = await repo().create({
      win: false,
      teamId,
      info: { scoring: { setCount: 3, decidingSetPoints: 15 } },
      teams: {
        home: {
          id: teamId,
          name: "Home",
          players: playerIds.map((id, i) => ({
            id,
            name: `Player ${i + 1}`,
            number: i + 1,
          })),
          staffs: [],
          stats: staleTeamStats,
        },
        away: { id: oid(), name: "Away", players: [], staffs: [], stats: [] },
      },
      sets: [
        {
          win: null,
          lineups: { home: lineup },
          options: { serve: "home" },
          entries: [
            {
              type: EntryType.RALLY,
              id: "entry-1",
              seq: 0,
              win: true,
              home: { score: 1, type: MoveType.ATTACK, num: 1 },
              away: { score: 0, type: MoveType.ATTACK, num: 1 },
            },
            {
              type: EntryType.RALLY,
              id: "entry-2",
              seq: 1,
              win: false,
              home: { score: 1, type: MoveType.ATTACK, num: 1 },
              away: { score: 1, type: MoveType.ATTACK, num: 1 },
            },
          ],
        },
      ],
    } as unknown as Omit<Game, "id">);

    const fetched = await repo().findById(game.id);
    const set = fetched!.sets[0]!;
    expect(set.entries).toHaveLength(2);

    const derived = deriveSetStats(set.entries, { options: set.options });

    expect(derived.home[MoveType.ATTACK]).toEqual({ success: 1, error: 1 });
    expect(derived.away[MoveType.ATTACK]).toEqual({ success: 1, error: 1 });
    expect(derived.home.rotation).toBe(0);
    expect(derived.home.substitution).toBe(0);
    expect(derived.home.timeout).toBe(0);
    expect(derived.home.challenge).toBe(0);
  });
});
