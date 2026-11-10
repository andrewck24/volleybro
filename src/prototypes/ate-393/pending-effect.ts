import * as Data from "effect/Data";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import {
  type PendingPorts,
  type QueuedWrite,
  type SendResult,
} from "./pending-core";

export class PendingSendFailure extends Data.TaggedError("PendingSendFailure")<{
  readonly cause: unknown;
}> {}

export function createEffectPendingCore<T>(ports: PendingPorts<T>) {
  const inFlight = new Map<string, Promise<SendResult>>();
  const retrySchedule = Schedule.exponential("1 second");

  const flushEffect = (
    scope: string,
  ): Effect.Effect<SendResult, PendingSendFailure> =>
    Effect.gen(function* () {
      const pending = ports.entries.filter(
        (entry) => entry.scope === scope && entry.nextAttemptAt <= ports.now(),
      );
      if (pending.length === 0) return { ok: true };

      const result = yield* Effect.tryPromise({
        try: () =>
          ports.send(
            scope,
            pending.map((entry) => entry.value),
          ),
        catch: (cause) => new PendingSendFailure({ cause }),
      });

      if (result.ok) {
        const ids = new Set(pending.map((entry) => entry.id));
        ports.entries.splice(
          0,
          ports.entries.length,
          ...ports.entries.filter((entry) => !ids.has(entry.id)),
        );
      } else {
        for (const entry of pending) {
          entry.attempts += 1;
          const delay = yield* Effect.catch(
            retryDelay(entry, ports.now()),
            () => Effect.succeed(30000),
          );
          entry.nextAttemptAt = ports.now() + delay;
          ports.schedule(() => void flush(scope), delay);
        }
      }
      return result;
    });

  const flush = (scope: string): Promise<SendResult> => {
    const running = inFlight.get(scope);
    if (running) return running;
    const promise = Effect.runPromise(flushEffect(scope))
      .catch((error: unknown) => {
        if (error instanceof PendingSendFailure) throw error;
        throw new PendingSendFailure({ cause: error });
      })
      .finally(() => inFlight.delete(scope));
    inFlight.set(scope, promise);
    return promise;
  };

  return { flush, retrySchedule };
}

const retryDelay = (entry: QueuedWrite<unknown>, now: number) =>
  Effect.gen(function* () {
    const step = yield* Schedule.toStep(Schedule.exponential("1 second"));
    let duration: Duration.Duration = Duration.millis(1000);
    for (let attempt = 0; attempt < entry.attempts; attempt += 1) {
      [duration] = yield* step(now, attempt);
    }
    return Math.min(30000, Duration.toMillis(duration));
  });

export { createEffectPendingCore as createPendingCore };
