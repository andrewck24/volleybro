import { Document, Model } from "mongoose";
import {
  AppError,
  ConflictError,
  NotFoundError,
  TransientError,
  UnexpectedError,
} from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";

const NETWORK_ERROR_NAMES = new Set([
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
]);

function isMongoError(error: unknown): error is { name: string; code?: unknown; message: string } {
  return error instanceof Error;
}

export function translateRepositoryError(error: unknown): AppError {
  if (isMongoError(error)) {
    if (error.name === "CastError") {
      return new NotFoundError(
        CommonReason.RESOURCE_NOT_FOUND,
        "The requested resource was not found",
        error.message,
      );
    }
    if (error.name === "MongoServerError" && error.code === 11000) {
      return new ConflictError(
        CommonReason.RESOURCE_NOT_FOUND,
        "A resource with the same identifier already exists",
        error.message,
      );
    }
    if (NETWORK_ERROR_NAMES.has(error.name)) {
      return new TransientError(
        CommonReason.UNHANDLED_ERROR,
        "A temporary database error occurred, please retry",
        error.message,
        { source: "database", retryable: true },
      );
    }
  }
  const original = error instanceof Error ? error : undefined;
  return new UnexpectedError(
    CommonReason.UNHANDLED_ERROR,
    "An unexpected database error occurred",
    original?.message ?? String(error),
    error,
  );
}

export class BaseMongoRepository<T, M extends Document> {
  constructor(protected readonly model: Model<M>) {}

  async find(filter: Record<string, any>): Promise<T[]> {
    const docs = await this.model.find(filter);
    if (!docs) return null;
    return docs.map((doc) => doc.toJSON() as unknown as T);
  }

  async findOne(filter: Record<string, any>): Promise<T | null> {
    const doc = await this.model.findOne(filter);
    if (!doc) return null;
    return doc.toJSON() as unknown as T;
  }

  async create(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    await doc.save();
    return doc.toJSON() as unknown as T;
  }

  async update(
    filter: string | Record<string, any>,
    data: Partial<T>
  ): Promise<T | null> {
    const query = typeof filter === "string" ? { _id: filter } : filter;
    const doc = await this.model.findOneAndReplace(query, data as any, {
      new: true,
    });
    if (!doc) return null;
    return doc.toJSON() as unknown as T;
  }

  async delete(filter: string | Record<string, any>): Promise<boolean> {
    const query = typeof filter === "string" ? { _id: filter } : filter;
    const result = await this.model.findOneAndDelete(query);
    return !!result;
  }
}
