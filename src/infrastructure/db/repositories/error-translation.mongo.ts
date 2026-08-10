import {
  AppError,
  ConflictError,
  NotFoundError,
  TransientError,
  UnexpectedError,
  ValidationError,
  CommonReason,
} from "@/entities/errors";

const NETWORK_ERROR_NAMES = new Set([
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
]);

export function translateRepositoryError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    if (error.name === "CastError") {
      // Only an uncastable `_id` is a lookup miss; anywhere else it is the
      // payload being written that the database cannot store.
      if ((error as { path?: unknown }).path === "_id") {
        return new NotFoundError(
          CommonReason.RESOURCE_NOT_FOUND,
          "The requested resource was not found",
          error.message,
        );
      }
      return new ValidationError(
        CommonReason.INVALID_INPUT,
        "The request contains a value the database cannot store",
        error.message,
      );
    }
    if (
      error.name === "MongoServerError" &&
      (error as { code?: unknown }).code === 11000
    ) {
      return new ConflictError(
        CommonReason.DUPLICATE_RESOURCE,
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
    return new UnexpectedError(
      CommonReason.UNHANDLED_ERROR,
      "An unexpected database error occurred",
      error.message,
      error,
    );
  }
  return new UnexpectedError(
    CommonReason.UNHANDLED_ERROR,
    "An unexpected database error occurred",
    String(error),
    error,
  );
}
