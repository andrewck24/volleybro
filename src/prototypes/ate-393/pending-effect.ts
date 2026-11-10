import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import {
  createAsyncPendingCore,
  type PendingPorts,
  type SendResult,
} from "./pending-core";
export function createEffectPendingCore<T>(ports: PendingPorts<T>) {
  const base = createAsyncPendingCore(ports);
  const flush = (scope: string): Promise<SendResult> =>
    Effect.runPromise(
      Effect.tryPromise({
        try: () => base.flush(scope),
        catch: (error) => error,
      }),
    );
  return {
    flush,
    backoff: Schedule.exponential("1 second").pipe(
      Schedule.upTo({ duration: "30 seconds" }),
    ),
  };
}
export { createEffectPendingCore as createPendingCore };
