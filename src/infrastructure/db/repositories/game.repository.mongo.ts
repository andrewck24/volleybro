import { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { EntryType, Game, GameSummary } from "@/entities/game";
import {
  GameDocument,
  Game as GameModel,
} from "@/infrastructure/db/mongoose/schemas/game";
import { BaseMongoRepository } from "@/infrastructure/db/repositories/base.repository.mongo";
import mongoose from "mongoose";

export class GameRepositoryImpl
  extends BaseMongoRepository<Game, GameDocument>
  implements IGameRepository
{
  constructor() {
    super(GameModel);
  }

  async findMatchesWithPagination(
    filter: { $and?: unknown[]; [key: string]: unknown } = {},
    options: {
      lastId?: string;
      limit?: number;
      sortField?: string;
      sortDirection?: 1 | -1;
    } = {},
  ): Promise<{ data: GameSummary[]; hasMore: boolean; lastId: string }> {
    // 設定默認參數
    const {
      lastId,
      limit = 10,
      sortField = "id",
      sortDirection = -1,
    } = options;

    // 處理游標條件
    if (lastId) {
      const operator = sortDirection === 1 ? "$gt" : "$lt";
      const lastObjectId = new mongoose.Types.ObjectId(lastId);
      if (filter.$and) {
        filter.$and.push({ [sortField]: { [operator]: lastObjectId } });
      } else {
        filter = { ...filter, [sortField]: { [operator]: lastObjectId } };
      }
    }

    // Convert any fields ending with "id" to ObjectId
    Object.keys(filter).forEach((key) => {
      if (key.toLowerCase().endsWith("id") && typeof filter[key] === "string") {
        filter[key] = new mongoose.Types.ObjectId(filter[key]);
      }
    });

    // 多取一條用來判斷是否有下一頁
    const results = await this.model
      .aggregate<GameSummary>([
        // 第一步：篩選條件
        { $match: filter } as mongoose.PipelineStage,

        // 第二步：排序
        { $sort: { [sortField]: sortDirection } },

        // 第三步：限制返回數量（多取一條）
        { $limit: limit + 1 },

        // 第四步：計算每個 set 的最後一個 rally
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

        // 重塑文件結構
        {
          $project: {
            id: 1,
            win: 1,
            info: 1,
            "teams.home.id": 1,
            "teams.home.name": 1,
            "teams.home.sets": 1,
            "teams.home.scores": 1,
            "teams.away.id": 1,
            "teams.away.name": 1,
            "teams.away.sets": 1,
            "teams.away.scores": 1,
          },
        },
      ])
      .exec();

    // 處理分頁結果
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      hasMore,
      lastId:
        data.length > 0
          ? String(
              (data[data.length - 1] as Record<string, unknown>)[sortField],
            )
          : (lastId ?? ""),
    };
  }
}
