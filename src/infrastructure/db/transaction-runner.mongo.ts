import type { ITransactionRunner } from "@/applications/services/transaction/transaction-runner.interface";
import { UnexpectedError } from "@/entities/errors";
import { translateRepositoryError } from "@/infrastructure/db/repositories/error-translation.mongo";
import mongoose from "mongoose";

// Repositories translate driver errors, which drops the labels the driver
// reads to retry a transaction; hand the original back so it can.
const retryableCause = (error: unknown) => {
  const cause = error instanceof UnexpectedError ? error.originalError : error;
  return cause instanceof mongoose.mongo.MongoError &&
    (cause.hasErrorLabel("TransientTransactionError") ||
      cause.hasErrorLabel("UnknownTransactionCommitResult"))
    ? cause
    : undefined;
};

export class MongooseTransactionRunner implements ITransactionRunner {
  async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await mongoose.connection.transaction(async () => {
        try {
          return await fn();
        } catch (error) {
          throw retryableCause(error) ?? error;
        }
      });
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }
}
