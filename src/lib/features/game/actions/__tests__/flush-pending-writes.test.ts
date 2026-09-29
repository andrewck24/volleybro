import { http, HttpResponse } from "msw";
import { ApiClientError } from "@/lib/api/api-client";
import {
  flushPendingWrites,
  toWriteError,
} from "@/lib/features/game/actions/flush-pending-writes";
import { PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS } from "@/lib/features/game/pending-writes";
import type { PendingEntry } from "@/lib/features/game/types";

import { server } from "../../../../../../test/msw/server";

const entries = [{ id: "e1", seq: 0 }] as unknown as PendingEntry["entry"][];
const confirmed = { entries: [{ id: "e1" }] };

const transientError = () =>
  new ApiClientError("boom", {
    code: "TRANSIENT",
    reason: "NETWORK_ERROR",
    status: 503,
  });

const unavailable = () =>
  HttpResponse.json(
    { code: "TRANSIENT", reason: "NETWORK_ERROR" },
    { status: 503 },
  );

/** Answers each successive PUT with the next responder and records what was sent. */
const answerRallies = (
  ...responders: (() => Response | Promise<Response>)[]
) => {
  const requests: { si: string | null; body: unknown }[] = [];
  server.use(
    http.put("/api/games/game-1/sets/rallies", async ({ request }) => {
      requests.push({
        si: new URL(request.url).searchParams.get("si"),
        body: await request.json(),
      });
      const respond =
        responders[Math.min(requests.length, responders.length) - 1]!;
      return respond();
    }),
  );
  return requests;
};

describe("flushPendingWrites", () => {
  beforeEach(() => {
    // With process.nextTick faked, fetch never settles under MSW.
    jest.useFakeTimers({ doNotFake: ["nextTick"] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("sends the whole batch in a single PUT to the rally endpoint", async () => {
    const requests = answerRallies(() => HttpResponse.json(confirmed));

    await flushPendingWrites("game-1", 3, entries);

    expect(requests).toEqual([{ si: "3", body: entries }]);
  });

  it("succeeds without retrying when the first attempt succeeds", async () => {
    const requests = answerRallies(() => HttpResponse.json(confirmed));

    const result = await flushPendingWrites("game-1", 0, entries);

    expect(result).toEqual({ ok: true, value: confirmed });
    expect(requests).toHaveLength(1);
  });

  it("retries a retryable failure inline, then succeeds", async () => {
    const requests = answerRallies(unavailable, unavailable, () =>
      HttpResponse.json(confirmed),
    );

    const promise = flushPendingWrites("game-1", 0, entries);
    for (const delay of PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS) {
      await jest.advanceTimersByTimeAsync(delay);
    }
    const result = await promise;

    expect(result).toEqual({ ok: true, value: confirmed });
    expect(requests).toHaveLength(3);
  });

  it("reports a retryable failure once the inline attempts are exhausted", async () => {
    const requests = answerRallies(unavailable);

    const promise = flushPendingWrites("game-1", 0, entries);
    for (const delay of PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS) {
      await jest.advanceTimersByTimeAsync(delay);
    }
    const result = await promise;

    expect(result).toMatchObject({ ok: false, retryable: true });
    expect(requests).toHaveLength(
      PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS.length + 1,
    );
  });

  it("does not retry a 4xx at all", async () => {
    const requests = answerRallies(() =>
      HttpResponse.json(
        { code: "VALIDATION", reason: "INVALID_INPUT" },
        { status: 400 },
      ),
    );

    const result = await flushPendingWrites("game-1", 0, entries);

    expect(result).toMatchObject({ ok: false, retryable: false });
    expect(requests).toHaveLength(1);
  });
});

describe("toWriteError", () => {
  it("keeps what a later decision can act on, and drops what cannot survive a copy change", () => {
    expect(toWriteError(transientError())).toEqual({
      code: "TRANSIENT",
      reason: "NETWORK_ERROR",
      status: 503,
    });
  });

  it("reports an unrecognised failure as unknown rather than inventing a reason", () => {
    expect(toWriteError(new Error("boom"))).toBeUndefined();
    expect(toWriteError(undefined)).toBeUndefined();
  });
});
