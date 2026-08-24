import { createMockGameRepository } from "@/__tests__/helpers";
import {
  COMPLETE_SET_RETRY_DELAYS_MS,
  completeSetWithRetry,
} from "@/applications/usecases/game/complete-set-with-retry";
import {
  CommonReason,
  TransientError,
  ValidationError,
} from "@/entities/errors";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

let mockGameRepository: ReturnType<typeof createMockGameRepository>;

const ref = { gameId: "game-1", setIndex: 0 };
const transientError = () =>
  new TransientError(CommonReason.UNHANDLED_ERROR, "db down", undefined, {
    retryable: true,
  });

beforeEach(() => {
  mockGameRepository = createMockGameRepository();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("completeSetWithRetry", () => {
  it("succeeds without retrying when the first attempt succeeds", async () => {
    mockGameRepository.completeSet.mockResolvedValue(undefined);

    const result = await completeSetWithRetry(
      mockGameRepository,
      ref,
      true,
      undefined,
    );

    expect(result).toBe(true);
    expect(mockGameRepository.completeSet).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable failure with the configured growing pauses, then succeeds", async () => {
    mockGameRepository.completeSet
      .mockRejectedValueOnce(transientError())
      .mockRejectedValueOnce(transientError())
      .mockResolvedValueOnce(undefined);

    const promise = completeSetWithRetry(
      mockGameRepository,
      ref,
      true,
      undefined,
    );

    for (const delay of COMPLETE_SET_RETRY_DELAYS_MS) {
      await jest.advanceTimersByTimeAsync(delay);
    }
    const result = await promise;

    expect(result).toBe(true);
    expect(mockGameRepository.completeSet).toHaveBeenCalledTimes(3);
  });

  it("reports unconfirmed once every attempt is exhausted", async () => {
    mockGameRepository.completeSet.mockRejectedValue(transientError());

    const promise = completeSetWithRetry(
      mockGameRepository,
      ref,
      true,
      undefined,
    );

    for (const delay of COMPLETE_SET_RETRY_DELAYS_MS) {
      await jest.advanceTimersByTimeAsync(delay);
    }
    const result = await promise;

    expect(result).toBe(false);
    expect(mockGameRepository.completeSet).toHaveBeenCalledTimes(
      COMPLETE_SET_RETRY_DELAYS_MS.length + 1,
    );
  });

  it("does not retry an error that is not retryable", async () => {
    mockGameRepository.completeSet.mockRejectedValue(
      new ValidationError(CommonReason.INVALID_INPUT, "bad input"),
    );

    const result = await completeSetWithRetry(
      mockGameRepository,
      ref,
      true,
      undefined,
    );

    expect(result).toBe(false);
    expect(mockGameRepository.completeSet).toHaveBeenCalledTimes(1);
  });

  it("does not retry a TransientError explicitly marked non-retryable", async () => {
    mockGameRepository.completeSet.mockRejectedValue(
      new TransientError(CommonReason.UNHANDLED_ERROR, "db down", undefined, {
        retryable: false,
      }),
    );

    const result = await completeSetWithRetry(
      mockGameRepository,
      ref,
      true,
      undefined,
    );

    expect(result).toBe(false);
    expect(mockGameRepository.completeSet).toHaveBeenCalledTimes(1);
  });
});
