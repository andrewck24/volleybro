import type {
  EntryRef,
  IGameRepository,
} from "@/applications/repositories/game.repository.interface";
import {
  NotFoundError,
  ValidationError,
  CommonReason,
  GameReason,
} from "@/entities/errors";
import {
  EntryType,
  type Entry,
  type EntryWrite,
  type Game,
  type GameSummary,
  type Set,
  planEntryUpserts,
  upsertEntries,
} from "@/entities/game";
import {
  GameDocument,
  Game as GameModel,
} from "@/infrastructure/db/mongoose/schemas/game";
import {
  mapEntryRead,
  mapEntryWrite,
  toGame,
  toGameDoc,
  mapSetRead,
  toLineupWrite,
  type RawGame,
  type RawSet,
} from "@/infrastructure/db/repositories/game.mapping.mongo";
import { translateRepositoryError } from "@/infrastructure/db/repositories/error-translation.mongo";
import { type Lineup } from "@/entities/team";
import mongoose, { type AnyBulkWriteOperation } from "mongoose";

type RawEntry = NonNullable<RawSet["entries"]>[number];
const toRawEntry = (entry: Entry) =>
  mapEntryWrite(
    entry as unknown as Record<string, unknown>,
  ) as unknown as RawEntry;

const MAX_ATTEMPTS = 5;

// Sets written before versions existed have none, read as zero. Not `null`:
// under an array index it would also match any set.
const atVer = (path: string, ver: number) => ({
  [`${path}.ver`]: ver ? ver : { $not: { $gt: 0 } },
});

const lineupWrites = (path: string, lineups: Set["lineups"]) =>
  Object.fromEntries(
    Object.entries(lineups)
      .filter(([, lineup]) => lineup)
      .map(([side, lineup]) => [
        `${path}.lineups.${side}`,
        toLineupWrite(lineup as unknown as Parameters<typeof toLineupWrite>[0]),
      ]),
  );

const fromDocument = (doc: GameDocument): Game =>
  toGame(doc.toObject() as RawGame);

export class GameRepositoryImpl implements IGameRepository {
  private readonly model = GameModel;

  async findById(id: string): Promise<Game | null> {
    try {
      const doc = await this.model.findById(id).exec();
      return doc ? fromDocument(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async create(data: Omit<Game, "id">): Promise<Game> {
    try {
      const doc = await this.model.create(toGameDoc(data) as object);
      return fromDocument(doc);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  /**
   * A positional write touches one entry, so the guard has to keep the write
   * off a path that does not exist yet — an out-of-range index would otherwise
   * pad the array with nulls instead of failing.
   */
  private async writeToSet(
    { gameId, setIndex }: EntryRef,
    guardPath: string,
    update: Record<string, unknown>,
  ): Promise<Entry[]> {
    try {
      const doc = await this.model
        .findOneAndUpdate(
          { _id: gameId, [guardPath]: { $exists: true } },
          update,
          {
            returnDocument: "after",
            projection: { sets: { $slice: [setIndex, 1] } },
          },
        )
        .exec();
      if (doc) {
        const [set] =
          (doc.toObject() as unknown as { sets?: RawSet[] }).sets ?? [];
        return (set?.entries ?? []).map((e) =>
          mapEntryRead(e),
        ) as unknown as Entry[];
      }
      // The guard failed as a whole; one lookup says which half of it did.
      const game = await this.model.exists({ _id: gameId }).exec();
      throw game
        ? new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found")
        : new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  private async findSet({ gameId, setIndex }: EntryRef): Promise<RawSet> {
    const doc = await this.model
      .findOne(
        { _id: gameId, [`sets.${setIndex}`]: { $exists: true } },
        { sets: { $slice: [setIndex, 1] } },
      )
      .exec();
    if (!doc) {
      const game = await this.model.exists({ _id: gameId }).exec();
      throw game
        ? new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found")
        : new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");
    }
    const [set] = (doc.toObject() as unknown as { sets?: RawSet[] }).sets ?? [];
    return set ?? {};
  }

  private async retryOnConflict(attempt: () => Promise<boolean>) {
    for (let i = 0; i < MAX_ATTEMPTS; i++) if (await attempt()) return;
    throw new Error("Set writes kept losing to concurrent writes");
  }

  async addSet(
    { gameId, setIndex }: EntryRef,
    set: Set,
    { clearTeamLineup = false } = {},
  ): Promise<Game> {
    try {
      const [doc] = toGameDoc({ sets: [set] }).sets as unknown[];
      const result = await this.model.updateOne(
        { _id: gameId, sets: { $size: setIndex } },
        {
          $push: { sets: doc },
          ...(clearTeamLineup && { $unset: { "teams.home.lineup": "" } }),
        },
      );
      if (result.matchedCount === 0) {
        const game = await this.model.exists({ _id: gameId }).exec();
        throw game
          ? new ValidationError(
              CommonReason.INVALID_INPUT,
              "A set can only be added after the game's last set",
            )
          : new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");
      }
      return (await this.findById(gameId))!;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async updateSet(
    ref: EntryRef,
    { options, lineup }: { options: Set["options"]; lineup?: Lineup },
  ): Promise<Game> {
    const path = `sets.${ref.setIndex}`;
    try {
      await this.retryOnConflict(async () => {
        const current = await this.findSet(ref);
        const set: Record<string, unknown> = {
          [`${path}.options`]: options,
        };
        if (lineup) {
          const { startingLineups, entries } = mapSetRead(
            current,
          ) as unknown as Pick<Set, "startingLineups" | "entries">;
          const starting = { ...startingLineups, home: lineup };
          const result = upsertEntries(
            { startingLineups: starting, entries },
            [],
          );
          if ("invalid" in result)
            throw new ValidationError(
              GameReason.INVALID_SUBSTITUTION,
              "The starting lineup invalidates a recorded substitution",
            );
          Object.assign(set, lineupWrites(path, result.set.lineups), {
            [`${path}.startingLineups.home`]: toLineupWrite(lineup),
          });
        }
        const result = await this.model.updateOne(
          {
            _id: ref.gameId,
            [`${path}`]: { $exists: true },
            ...atVer(path, current.ver ?? 0),
          },
          { $set: set, $inc: { [`${path}.ver`]: 1 } },
        );
        return result.matchedCount === 1;
      });
      return (await this.findById(ref.gameId))!;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async upsertEntries(
    ref: EntryRef,
    writes: EntryWrite[],
    operator: string,
  ): Promise<Entry[]> {
    const { setIndex } = ref;
    const path = `sets.${setIndex}`;
    const guard = { _id: ref.gameId, [path]: { $exists: true } };

    try {
      // A write that matches nothing lost a race to another write on the set;
      // planning again against a fresh read re-classifies it (a lost create
      // becomes an edit) and re-validates the lineups instead of dropping it.
      await this.retryOnConflict(async () => {
        const current = await this.findSet(ref);
        const ver = current.ver ?? 0;
        const planned = planEntryUpserts(
          mapSetRead(current) as unknown as Pick<
            Set,
            "startingLineups" | "entries"
          >,
          writes,
          operator,
        );
        if ("invalid" in planned)
          throw new ValidationError(
            GameReason.INVALID_SUBSTITUTION,
            "The substitution does not fit the lineup",
          );
        const { steps } = planned;
        const plan = steps.map((step) =>
          "created" in step
            ? { id: step.id, created: toRawEntry(step.created) }
            : { id: step.id, edited: toRawEntry(step.edited) },
        );
        const lineupSet = lineupWrites(path, planned.set.lineups);

        // Each op is conditioned on the ver the previous op left; lineups go
        // only on the last op, so they never lead the entries.
        const last = plan.length - 1;
        const ops = plan.map((step, i): AnyBulkWriteOperation<GameDocument> => {
          const filter = { ...guard, ...atVer(path, ver + i) };
          const bump = { [`${path}.ver`]: 1 };
          return "created" in step
            ? {
                updateOne: {
                  filter: {
                    ...filter,
                    [`${path}.entries.id`]: { $ne: step.id },
                  },
                  update: {
                    $push: {
                      [`${path}.entries`]: {
                        $each: [step.created],
                        $sort: { seq: 1 },
                      },
                    },
                    $inc: bump,
                    ...(i === last && { $set: lineupSet }),
                  },
                },
              }
            : {
                updateOne: {
                  filter: { ...filter, [`${path}.entries.id`]: step.id },
                  update: {
                    // Mongoose drops a discriminator's field when an update names
                    // it through an array filter, so the slot is written whole.
                    $set: {
                      [`${path}.entries.$[e]`]: step.edited,
                      ...(i === last && lineupSet),
                    },
                    $inc: bump,
                  },
                  arrayFilters: [{ "e.id": step.id }],
                },
              };
        });

        if (!ops.length) return true;
        const session = await this.model.db.startSession();
        const conflict = new Error("Entry batch lost a race");
        try {
          await session.withTransaction(async () => {
            const result = await this.model.bulkWrite(ops, {
              ordered: true,
              session,
            });
            if (result.matchedCount !== ops.length) throw conflict;
          });
          return true;
        } catch (error) {
          if (error === conflict) return false;
          throw error;
        } finally {
          await session.endSession();
        }
      });
      const set = await this.findSet(ref);
      return (set.entries ?? []).map((e) => mapEntryRead(e)) as Entry[];
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async completeSet(
    ref: EntryRef,
    win: boolean | null,
    gameWin?: boolean | null,
  ): Promise<void> {
    const path = `sets.${ref.setIndex}`;
    await this.writeToSet(ref, path, {
      $set: {
        [`${path}.win`]: win,
        ...(gameWin !== undefined && { win: gameWin }),
      },
    });
  }

  async findGameSummaries(
    teamId: string,
    options: { lastId?: string; limit?: number } = {},
  ): Promise<{ data: GameSummary[]; hasMore: boolean; lastId: string }> {
    try {
      const { lastId, limit = 10 } = options;
      const teamObjectId = new mongoose.Types.ObjectId(teamId);

      const matchFilter: Record<string, unknown> = { teamId: teamObjectId };
      if (lastId && /^[0-9a-fA-F]{24}$/.test(lastId)) {
        matchFilter._id = { $lt: new mongoose.Types.ObjectId(lastId) };
      }

      const results = await this.model
        .aggregate<GameSummary>([
          { $match: matchFilter },
          { $sort: { _id: -1 } },
          { $limit: limit + 1 },
          {
            $addFields: {
              setLastRallies: {
                $map: {
                  input: "$sets",
                  as: "set",
                  in: {
                    $let: {
                      vars: {
                        rallies: {
                          $filter: {
                            input: "$$set.entries",
                            as: "entry",
                            cond: { $eq: ["$$entry.type", EntryType.RALLY] },
                          },
                        },
                      },
                      in: { $arrayElemAt: ["$$rallies", -1] },
                    },
                  },
                },
              },
              setResults: {
                $map: {
                  input: "$sets",
                  as: "set",
                  in: "$$set.win",
                },
              },
            },
          },
          {
            $addFields: {
              "teams.home.scores": {
                $map: {
                  input: "$setLastRallies",
                  as: "lastRally",
                  in: "$$lastRally.home.score",
                },
              },
              "teams.away.scores": {
                $map: {
                  input: "$setLastRallies",
                  as: "lastRally",
                  in: "$$lastRally.away.score",
                },
              },
              "teams.home.sets": {
                $size: {
                  $filter: {
                    input: "$setResults",
                    as: "win",
                    cond: { $eq: ["$$win", true] },
                  },
                },
              },
              "teams.away.sets": {
                $size: {
                  $filter: {
                    input: "$setResults",
                    as: "win",
                    cond: { $eq: ["$$win", false] },
                  },
                },
              },
            },
          },
          {
            $project: {
              id: { $toString: "$_id" },
              win: 1,
              info: 1,
              "teams.home.id": { $toString: "$teams.home._id" },
              "teams.home.name": 1,
              "teams.home.sets": 1,
              "teams.home.scores": 1,
              "teams.away.id": { $toString: "$teams.away._id" },
              "teams.away.name": 1,
              "teams.away.sets": 1,
              "teams.away.scores": 1,
            },
          },
        ])
        .exec();

      const hasMore = results.length > limit;
      const data = hasMore ? results.slice(0, limit) : results;

      return {
        data,
        hasMore,
        // length checked > 0, so the last element is present
        lastId: data.length > 0 ? data[data.length - 1]!.id : (lastId ?? ""),
      };
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }
}
