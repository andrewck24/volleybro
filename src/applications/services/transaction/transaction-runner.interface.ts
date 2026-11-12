export interface ITransactionRunner {
  run<T>(fn: () => Promise<T>): Promise<T>;
}
