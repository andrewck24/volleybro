import * as apiClientModule from "@/lib/api/api-client";
import { ApiClientError } from "@/lib/api/api-client";
import { flushPendingWrites } from "@/lib/features/game/actions/flush-pending-writes";
import { PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS } from "@/lib/features/game/pending-writes";
import type { PendingEntry } from "@/lib/features/game/types";

jest.mock("@/lib/api/api-client", () => ({
  ...jest.requireActual("@/lib/api/api-client"),
  apiClient: jest.fn(),
}));

const apiClient = apiClientModule.apiClient as jest.Mock;
const entries = [{ id: "e1", seq: 0 }] as unknown as PendingEntry["entry"][];

const transientError = () =>
  new ApiClientError("boom", {
    code: "TRANSIENT",
    reason: "NETWORK_ERROR",
    detail: "boom",
    status: 503,
  });

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.resetAllMocks();
});

describe("flushPendingWrites", () => {
  it("sends the whole batch in a single PUT to the rally endpoint", async () => {
    apiClient.mockResolvedValue({ entries: [{ id: "e1" }] });

    await flushPendingWrites("game-1", 0, entries);

    expect(apiClient).toHaveBeenCalledWith(
      "/api/games/game-1/sets/rallies?si=0",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(entries),
      }),
    );
  });

  it("succeeds without retrying when the first attempt succeeds", async () => {
    const response = { entries: [{ id: "e1" }] };
    apiClient.mockResolvedValue(response);

    const result = await flushPendingWrites("game-1", 0, entries);

    expect(result).toEqual({ ok: true, response });
    expect(apiClient).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable failure inline, then succeeds", async () => {
    const response = { entries: [{ id: "e1" }] };
    apiClient
      .mockRejectedValueOnce(transientError())
      .mockRejectedValueOnce(transientError())
      .mockResolvedValueOnce(response);

    const promise = flushPendingWrites("game-1", 0, entries);
    for (const delay of PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS) {
      await jest.advanceTimersByTimeAsync(delay);
    }
    const result = await promise;

    expect(result).toEqual({ ok: true, response });
    expect(apiClient).toHaveBeenCalledTimes(3);
  });

  it("reports a retryable failure once the inline attempts are exhausted", async () => {
    apiClient.mockRejectedValue(transientError());

    const promise = flushPendingWrites("game-1", 0, entries);
    for (const delay of PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS) {
      await jest.advanceTimersByTimeAsync(delay);
    }
    const result = await promise;

    expect(result).toMatchObject({ ok: false, retryable: true });
    expect(apiClient).toHaveBeenCalledTimes(
      PENDING_WRITE_IMMEDIATE_RETRY_DELAYS_MS.length + 1,
    );
  });

  it("does not retry a 4xx at all", async () => {
    const error = new ApiClientError("bad", {
      code: "VALIDATION",
      reason: "INVALID_INPUT",
      detail: "bad",
      status: 400,
    });
    apiClient.mockRejectedValue(error);

    const result = await flushPendingWrites("game-1", 0, entries);

    expect(result).toMatchObject({ ok: false, retryable: false });
    expect(apiClient).toHaveBeenCalledTimes(1);
  });
});
