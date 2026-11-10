import { describe, expect, it, jest } from "@jest/globals";
import {
  createAsyncPendingCore,
  type QueuedWrite,
  type SendResult,
} from "../pending-core";
import { createRtkPendingCore } from "../pending-rtk-listener";
import { createEffectPendingCore } from "../pending-effect";
import { configureStore } from "@reduxjs/toolkit";
import { flushScope } from "../pending-rtk-listener";

const variants = [
  ["async", createAsyncPendingCore],
  ["rtk-listener", createRtkPendingCore],
  ["effect", createEffectPendingCore],
] as const;
describe.each(variants)("pending-write core %s", (_variant, createCore) => {
  it("single-flights concurrent flushes and removes entries after success", async () => {
    let release!: (result: SendResult) => void;
    const entries: QueuedWrite<number>[] = [
      { id: "one", scope: "game:set", value: 1, attempts: 0, nextAttemptAt: 0 },
    ];
    const send = jest.fn(
      () =>
        new Promise<SendResult>((resolve) => {
          release = resolve;
        }),
    );
    const schedule = jest.fn();
    const core = createCore({
      entries,
      send,
      now: () => 0,
      schedule,
    });
    const first = core.flush("game:set");
    const second = core.flush("game:set");
    expect(first).toBe(second);
    release({ ok: true });
    await expect(first).resolves.toEqual({ ok: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(entries).toEqual([]);
    expect(schedule).not.toHaveBeenCalled();
  });

  it("sends only one scope and retains failures with exponential injectable scheduling", async () => {
    let now = 10;
    const entries: QueuedWrite<number>[] = [
      { id: "a", scope: "s1", value: 1, attempts: 0, nextAttemptAt: 0 },
      { id: "b", scope: "s2", value: 2, attempts: 0, nextAttemptAt: 0 },
    ];
    const timers: { callback: () => void; delay: number }[] = [];
    const send = jest.fn(async (_scope: string, _values: number[]) => ({
      ok: false as const,
      outcome: "failed" as const,
    }));
    const core = createCore({
      entries,
      send,
      now: () => now,
      schedule: (callback, delay) => timers.push({ callback, delay }),
    });
    await core.flush("s1");
    expect(send).toHaveBeenCalledWith("s1", [1]);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ attempts: 1, nextAttemptAt: 1010 });
    expect(timers[0]?.delay).toBe(1000);
    now = 1010;
    await core.flush("s1");
    expect(entries[0]).toMatchObject({ attempts: 2, nextAttemptAt: 3010 });
    expect(timers[1]?.delay).toBe(2000);
    expect(entries[1]?.attempts).toBe(0);
  });

  it("retains an outcome-unknown send for retry", async () => {
    const entries: QueuedWrite<number>[] = [
      { id: "a", scope: "s", value: 1, attempts: 0, nextAttemptAt: 0 },
    ];
    const send = jest.fn(
      async (_scope: string, _values: number[]): Promise<SendResult> => ({
        ok: false,
        outcome: "unknown",
      }),
    );
    const core = createCore({
      entries,
      send,
      now: () => 0,
      schedule: () => undefined,
    });
    await expect(core.flush("s")).resolves.toEqual({
      ok: false,
      outcome: "unknown",
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.attempts).toBe(1);
    await core.flush("s");
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("RTK listener adapter", () => {
  it("flushes a scope through listener middleware and a minimal store", async () => {
    const entries: QueuedWrite<number>[] = [
      { id: "one", scope: "s", value: 1, attempts: 0, nextAttemptAt: 0 },
    ];
    let complete!: () => void;
    const sent = new Promise<void>((resolve) => {
      complete = resolve;
    });
    const core = createRtkPendingCore({
      entries,
      send: async () => {
        complete();
        return { ok: true } as const;
      },
      now: () => 0,
      schedule: () => undefined,
    });
    const store = configureStore({
      reducer: (state = {}) => state,
      middleware: (getDefault) => getDefault().prepend(core.middleware),
    });
    store.dispatch(flushScope("s"));
    await sent;
    expect(entries).toEqual([]);
  });
});
