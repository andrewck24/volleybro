export type QueuedWrite<T> = {
  id: string;
  scope: string;
  value: T;
  attempts: number;
  nextAttemptAt: number;
};
export type SendResult =
  { ok: true } | { ok: false; outcome: "failed" | "unknown" };
export type PendingPorts<T> = {
  send(scope: string, values: T[]): Promise<SendResult>;
  now(): number;
  schedule(callback: () => void, delayMs: number): unknown;
  entries: QueuedWrite<T>[];
};

export function createAsyncPendingCore<T>(ports: PendingPorts<T>) {
  const inFlight = new Map<string, Promise<SendResult>>();
  const flush = (scope: string): Promise<SendResult> => {
    const running = inFlight.get(scope);
    if (running) return running;
    const pending = ports.entries.filter(
      (entry) => entry.scope === scope && entry.nextAttemptAt <= ports.now(),
    );
    if (!pending.length) return Promise.resolve({ ok: true });
    const send = ports
      .send(
        scope,
        pending.map((entry) => entry.value),
      )
      .then((result) => {
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
            const delay = Math.min(30000, 1000 * 2 ** (entry.attempts - 1));
            entry.nextAttemptAt = ports.now() + delay;
            ports.schedule(() => void flush(scope), delay);
          }
        }
        return result;
      })
      .finally(() => inFlight.delete(scope));
    inFlight.set(scope, send);
    return send;
  };
  return { flush };
}
