export interface ITransactionRunner {
  /** Commits every write `fn` makes together, or none of them if it throws. */
  run<T>(fn: () => Promise<T>): Promise<T>;
}
