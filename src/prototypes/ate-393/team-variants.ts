import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Data from "effect/Data";
import {
  CreateTeamSchema,
  TeamUpdateSchema,
} from "@/interface/validations/team";
import { ValidationError, UnexpectedError } from "@/entities/errors";
import { CommonReason } from "@/entities/errors";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITransactionRunner } from "@/applications/services/transaction/transaction-runner.interface";
import type { Team } from "@/entities/team";

export type CreateInput = { name: string; nickname?: string };
export type UpdateInput = { name?: string; nickname?: string };
export type VariantId =
  "zod-async" | "schema-async" | "zod-effect" | "schema-effect";
type Execute<A> = (input: A) => Promise<unknown>;

export const CreateTeamRequest = Schema.Struct({
  name: Schema.String,
  nickname: Schema.optional(Schema.String),
});
export class TeamRepositoryFailure extends Data.TaggedError(
  "TeamRepositoryFailure",
)<{ readonly cause: unknown }> {}
export class PlayerRepositoryFailure extends Data.TaggedError(
  "PlayerRepositoryFailure",
)<{ readonly cause: unknown }> {}
export class RequestDecodeFailure extends Data.TaggedError(
  "RequestDecodeFailure",
)<{ readonly cause: unknown }> {}
type TeamFailure =
  TeamRepositoryFailure | PlayerRepositoryFailure | RequestDecodeFailure;

const decode = (schema: Schema.Constraint, input: unknown) =>
  Schema.decodeUnknownEffect(schema, { onExcessProperty: "error" })(input);
const mapFailure = (
  program: Effect.Effect<unknown, TeamFailure>,
): Effect.Effect<unknown, Error> =>
  Effect.catchTags(program, {
    TeamRepositoryFailure: (error) =>
      Effect.fail(
        new UnexpectedError(
          CommonReason.UNHANDLED_ERROR,
          "Unexpected error",
          error.cause instanceof Error ? error.cause.message : undefined,
          error.cause,
        ),
      ),
    PlayerRepositoryFailure: (error) =>
      Effect.fail(
        new UnexpectedError(
          CommonReason.UNHANDLED_ERROR,
          "Unexpected error",
          error.cause instanceof Error ? error.cause.message : undefined,
          error.cause,
        ),
      ),
    RequestDecodeFailure: () =>
      Effect.fail(
        new ValidationError(CommonReason.INVALID_INPUT, "Invalid input"),
      ),
  });

const createEffect = (
  input: CreateInput & { userId: string; userName: string },
  repos: {
    team: ITeamRepository;
    player: IPlayerRepository;
    tx: ITransactionRunner;
  },
): Effect.Effect<Team, TeamFailure> => {
  const program = Effect.gen(function* () {
    const team = yield* Effect.tryPromise({
      try: () =>
        repos.team.create({
          name: input.name,
          nickname: input.nickname,
          lineups: new Array(3).fill({
            options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
            starting: new Array(6).fill({ id: null }),
            liberos: [],
            substitutes: [],
          }),
        }),
      catch: (cause) => new TeamRepositoryFailure({ cause }),
    });
    const owner = yield* Effect.tryPromise({
      try: () =>
        repos.player.create({
          name: input.userName,
          status: PlayerStatus.JOINED,
          number: 1,
          role: PlayerRole.ADMIN,
          teamId: team.id,
          userId: input.userId,
        }),
      catch: (cause) => new PlayerRepositoryFailure({ cause }),
    });
    return yield* Effect.tryPromise({
      try: () => repos.team.update(team.id, { ownerPlayerId: owner.id }),
      catch: (cause) => new TeamRepositoryFailure({ cause }),
    });
  });
  return Effect.tryPromise({
    try: () => repos.tx.run(() => Effect.runPromise(program)),
    catch: (cause) =>
      cause instanceof TeamRepositoryFailure ||
      cause instanceof PlayerRepositoryFailure ||
      cause instanceof RequestDecodeFailure
        ? cause
        : new TeamRepositoryFailure({ cause }),
  });
};

export const createTeamVariants: Record<
  VariantId,
  (
    input: unknown,
    execute: Execute<CreateInput>,
    repos?: {
      team: ITeamRepository;
      player: IPlayerRepository;
      tx: ITransactionRunner;
    },
  ) => Promise<unknown>
> = {
  "zod-async": async (input, execute) =>
    execute(CreateTeamSchema.parse(requestFields(input))),
  "schema-async": async (input, execute) =>
    execute(
      await Schema.decodeUnknownPromise(CreateTeamRequest, {
        onExcessProperty: "error",
      })(requestFields(input)),
    ),
  "zod-effect": async (input, execute, repos) => {
    if (!repos) return execute(CreateTeamSchema.parse(requestFields(input)));
    const parsed = Effect.try({
      try: () => CreateTeamSchema.parse(requestFields(input)),
      catch: (cause) => new RequestDecodeFailure({ cause }),
    });
    const program = Effect.flatMap(parsed, (value) =>
      createEffect(
        {
          ...value,
          userId: (input as { userId: string }).userId,
          userName: (input as { userName: string }).userName,
        },
        repos,
      ),
    );
    return Effect.runPromise(program);
  },
  "schema-effect": async (input, execute, repos) => {
    if (!repos)
      return execute(
        await Schema.decodeUnknownPromise(CreateTeamRequest, {
          onExcessProperty: "error",
        })(input),
      );
    const decoded = yieldDecode(requestFields(input));
    return Effect.runPromise(
      mapFailure(
        Effect.flatMap(decoded, (parsed) =>
          createEffect(
            {
              ...parsed,
              userId: (input as { userId: string }).userId,
              userName: (input as { userName: string }).userName,
            },
            repos,
          ),
        ),
      ),
    );
  },
};
const requestFields = (input: unknown) => {
  const value = input as { name: unknown; nickname?: unknown };
  return { name: value.name, nickname: value.nickname };
};
const yieldDecode = (input: unknown) =>
  Effect.catch(
    decode(CreateTeamRequest, input) as Effect.Effect<
      CreateInput,
      Schema.SchemaError
    >,
    (cause) => Effect.fail(new RequestDecodeFailure({ cause })),
  );

export const updateTeamVariants: Record<
  VariantId,
  (input: unknown, execute: Execute<UpdateInput>) => Promise<unknown>
> = {
  "zod-async": async (input, execute) => execute(TeamUpdateSchema.parse(input)),
  "schema-async": async (input, execute) =>
    execute(
      await Schema.decodeUnknownPromise(
        Schema.Struct({
          name: Schema.optional(Schema.String),
          nickname: Schema.optional(Schema.String),
        }),
        { onExcessProperty: "error" },
      )(input),
    ),
  "zod-effect": async (input, execute) =>
    Effect.runPromise(
      Effect.promise(() => execute(TeamUpdateSchema.parse(input))),
    ),
  "schema-effect": async (input, execute) =>
    Effect.runPromise(
      Effect.promise(() =>
        execute(
          Schema.decodeUnknownSync(
            Schema.Struct({
              name: Schema.optional(Schema.String),
              nickname: Schema.optional(Schema.String),
            }),
            { onExcessProperty: "error" },
          )(input),
        ),
      ),
    ),
};
export type UpdateVariantId = "async" | "effect";
export const updateTeamStyleVariants: Record<
  UpdateVariantId,
  (input: unknown, execute: Execute<UpdateInput>) => Promise<unknown>
> = {
  async: async (input, execute) => execute(TeamUpdateSchema.parse(input)),
  effect: async (input, execute) =>
    Effect.runPromise(
      Effect.promise(() => execute(TeamUpdateSchema.parse(input))),
    ),
};
