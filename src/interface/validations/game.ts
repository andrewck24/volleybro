import type { ICreateGameInput } from "@/applications/usecases/game/create-game.usecase";
import type { ICreateSetInput } from "@/applications/usecases/game/create-set.usecase";
import type { ICreateSubstitutionInput } from "@/applications/usecases/game/create-substitution.usecase";
import type { IRecordRalliesInput } from "@/applications/usecases/game/record-rallies.usecase";
import type { IUpdateSetInput } from "@/applications/usecases/game/update-set.usecase";
import {
  MatchCategory,
  MatchDivision,
  MatchPhase,
  MoveType,
  Side,
} from "@/entities/game";
import { objectId, rallyPlayerId } from "@/interface/validations/object-id";
import { LineupSchema } from "@/interface/validations/team";
import { scoringMoves } from "@/lib/scoring-moves";
import { z } from "zod";

const GamePlayerSchema = z
  .object({
    id: objectId,
    name: z.string().min(1),
    number: z.number().int(),
  })
  .strict();

const StaffSchema = z
  .object({
    id: objectId,
    name: z.string().min(1),
    number: z.number().int(),
    position: z.enum(["", "C", "AC", "T", "M"]),
  })
  .strict();

/** Home is a resolvable Team, away is a typed-in name. See request-schema-boundary D5. */
const HomeTeamSchema = z
  .object({
    id: objectId.optional(),
    name: z.string(),
    players: z.array(GamePlayerSchema),
    staffs: z.array(StaffSchema).optional(),
    lineup: LineupSchema.optional(),
  })
  .strict();

const AwayTeamSchema = HomeTeamSchema.extend({
  players: z.array(GamePlayerSchema).optional(),
});

const MatchInfoSchema = z
  .object({
    id: objectId.optional(),
    name: z.string().optional(),
    number: z.number().int().optional(),
    phase: z.nativeEnum(MatchPhase).optional(),
    division: z.nativeEnum(MatchDivision).optional(),
    category: z.nativeEnum(MatchCategory).optional(),
    scoring: z
      .object({
        setCount: z.number().int(),
        decidingSetPoints: z.number().int(),
      })
      .strict(),
    location: z
      .object({
        city: z.string().optional(),
        hall: z.string().optional(),
      })
      .strict()
      .optional(),
    time: z
      .object({
        date: z.iso
          .datetime()
          .transform((v) => new Date(v))
          .optional(),
        start: z.string().optional(),
        end: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

/** POST /api/games */
export const CreateGameSchema = z
  .object({
    info: MatchInfoSchema,
    teams: z
      .object({
        home: HomeTeamSchema,
        away: AwayTeamSchema,
      })
      .strict(),
  })
  .strict() satisfies z.ZodType<ICreateGameInput["data"]>;

const SetOptionsSchema = z
  .object({
    serve: z.enum(["home", "away"]),
    time: z
      .object({
        start: z.string(),
        end: z.string(),
      })
      .strict()
      .optional(),
  })
  .strict();

/** POST /api/games/{gameId}/sets */
export const CreateSetSchema = z
  .object({
    lineup: LineupSchema,
    options: SetOptionsSchema,
  })
  .strict() satisfies z.ZodType<ICreateSetInput["data"]>;

/** PUT /api/games/{gameId}/sets */
export const UpdateSetSchema = z
  .object({
    lineup: LineupSchema.optional(),
    options: SetOptionsSchema,
  })
  .strict() satisfies z.ZodType<IUpdateSetInput["data"]>;

const RallyDetailSchema = z
  .object({
    score: z.number(),
    type: z.nativeEnum(MoveType),
    num: z
      .number()
      .int()
      .min(0)
      .max(scoringMoves.length - 1),
    player: z
      .object({
        id: rallyPlayerId,
        zone: z.number().int(),
      })
      .strict()
      .optional(),
  })
  .strict();

const RallySchema = z
  .object({
    id: z.string().min(1),
    seq: z.number().int(),
    win: z.boolean(),
    home: RallyDetailSchema,
    away: RallyDetailSchema,
  })
  .strict();

/** PUT /api/games/{gameId}/sets/rallies */
export const RecordRalliesSchema = z.array(RallySchema) satisfies z.ZodType<
  IRecordRalliesInput["data"]
>;

/** POST /api/games/{gameId}/sets/substitutions */
export const CreateSubstitutionSchema = z
  .object({
    id: z.string().min(1),
    seq: z.number().int(),
    team: z.nativeEnum(Side),
    players: z
      .object({
        in: objectId,
        out: objectId,
      })
      .strict(),
  })
  .strict() satisfies z.ZodType<ICreateSubstitutionInput["data"]>;
