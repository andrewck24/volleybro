import {
  CreateTeamSchema,
  TeamUpdateSchema,
} from "@/interface/validations/team";

export type CreateInput = { name: string; nickname?: string };
export type UpdateInput = { name?: string; nickname?: string };
export type VariantId =
  "zod-async" | "schema-async" | "zod-effect" | "schema-effect";

type EffectRuntime = {
  runPromise: <A>(effect: object) => Promise<A>;
  tryPromise: (options: {
    try: () => Promise<unknown>;
    catch: (error: unknown) => unknown;
  }) => object;
};
type SchemaRuntime = {
  String: unknown;
  optional: (schema: unknown) => unknown;
  Struct: (fields: Record<string, unknown>) => unknown;
  decodeUnknownPromise: (
    schema: unknown,
    options: { onExcessProperty: "error" },
  ) => (input: unknown) => Promise<unknown>;
};
const nativeImport = <T>(specifier: string): Promise<T> =>
  new Function("specifier", "return import(specifier)")(
    specifier,
  ) as Promise<T>;
const effectRun = async <A>(work: () => Promise<A>): Promise<A> => {
  const Effect = await nativeImport<EffectRuntime>("effect/Effect");
  return Effect.runPromise(
    Effect.tryPromise({ try: work, catch: (error: unknown) => error }),
  );
};
const schemaDecode = async <A>(
  shape: "create" | "update",
  input: unknown,
): Promise<A> => {
  const Schema = await nativeImport<SchemaRuntime>("effect/Schema");
  const schema =
    shape === "create"
      ? Schema.Struct({
          name: Schema.String,
          nickname: Schema.optional(Schema.String),
        })
      : Schema.Struct({
          name: Schema.optional(Schema.String),
          nickname: Schema.optional(Schema.String),
        });
  return Schema.decodeUnknownPromise(schema, { onExcessProperty: "error" })(
    input,
  ) as Promise<A>;
};
type Execute<A> = (input: A) => Promise<unknown>;
export const createTeamVariants: Record<
  VariantId,
  (input: unknown, execute: Execute<CreateInput>) => Promise<unknown>
> = {
  "zod-async": async (input, execute) => execute(CreateTeamSchema.parse(input)),
  "schema-async": async (input, execute) =>
    execute((await schemaDecode<CreateInput>("create", input)) as CreateInput),
  "zod-effect": async (input, execute) =>
    effectRun(async () => execute(CreateTeamSchema.parse(input))),
  "schema-effect": async (input, execute) =>
    effectRun(async () =>
      execute(
        (await schemaDecode<CreateInput>("create", input)) as CreateInput,
      ),
    ),
};

export const updateTeamVariants: Record<
  VariantId,
  (input: unknown, execute: Execute<UpdateInput>) => Promise<unknown>
> = {
  "zod-async": async (input, execute) => execute(TeamUpdateSchema.parse(input)),
  "schema-async": async (input, execute) =>
    execute((await schemaDecode<UpdateInput>("update", input)) as UpdateInput),
  "zod-effect": async (input, execute) =>
    effectRun(async () => execute(TeamUpdateSchema.parse(input))),
  "schema-effect": async (input, execute) =>
    effectRun(async () =>
      execute(
        (await schemaDecode<UpdateInput>("update", input)) as UpdateInput,
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
    effectRun(async () => execute(TeamUpdateSchema.parse(input))),
};
