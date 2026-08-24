function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type RetryOutcome<T> =
  { ok: true; value: T } | { ok: false; retryable: boolean; error: unknown };

/**
 * Runs `attempt` once, then again after each entry of `delays` as long as
 * the failure is retryable, growing pauses between tries. Domain-agnostic:
 * callers supply their own `isRetryable` so this never has to know what a
 * TransientError or an ApiClientError is.
 */
export async function withRetry<T>(
  delays: number[],
  isRetryable: (error: unknown) => boolean,
  attempt: () => Promise<T>,
): Promise<RetryOutcome<T>> {
  for (let i = 0; ; i++) {
    try {
      return { ok: true, value: await attempt() };
    } catch (error) {
      const retryable = isRetryable(error);
      const delay = delays[i];
      if (delay === undefined || !retryable) {
        return { ok: false, retryable, error };
      }
      await wait(delay);
    }
  }
}
