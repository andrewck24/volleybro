import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
test("effect 4 loads under jest", async () => {
  const s = Schema.Struct({ a: Schema.String });
  expect(Schema.decodeUnknownSync(s)({ a: "x" })).toEqual({ a: "x" });
  await expect(Effect.runPromise(Effect.succeed(1))).resolves.toBe(1);
});
