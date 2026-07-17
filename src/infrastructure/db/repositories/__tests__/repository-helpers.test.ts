import {
  ConflictError,
  NotFoundError,
  TransientError,
  UnexpectedError,
} from "@/entities/errors/app-error";
import { translateRepositoryError } from "@/infrastructure/db/repositories/repository-helpers.mongo";

describe("Repository error translation", () => {
  describe("CastError → NotFoundError", () => {
    it("translates Mongoose CastError to NotFoundError", () => {
      const castError = Object.assign(
        new Error("Cast to ObjectId failed for value bad-id"),
        {
          name: "CastError",
        },
      );
      const result = translateRepositoryError(castError);
      expect(result).toBeInstanceOf(NotFoundError);
    });
  });

  describe("MongoServerError 11000 → ConflictError", () => {
    it("translates duplicate key error (11000) to ConflictError", () => {
      const dupError = Object.assign(new Error("E11000 duplicate key error"), {
        name: "MongoServerError",
        code: 11000,
      });
      const result = translateRepositoryError(dupError);
      expect(result).toBeInstanceOf(ConflictError);
    });
  });

  describe("connection/timeout error → TransientError", () => {
    it("translates MongoNetworkError to TransientError with database source", () => {
      const networkError = Object.assign(new Error("connection refused"), {
        name: "MongoNetworkError",
      });
      const result = translateRepositoryError(networkError);
      expect(result).toBeInstanceOf(TransientError);
      expect((result as TransientError).source).toBe("database");
    });

    it("translates MongoNetworkTimeoutError to TransientError with database source", () => {
      const timeoutError = Object.assign(new Error("connection timed out"), {
        name: "MongoNetworkTimeoutError",
      });
      const result = translateRepositoryError(timeoutError);
      expect(result).toBeInstanceOf(TransientError);
      expect((result as TransientError).source).toBe("database");
    });
  });

  describe("unknown error → UnexpectedError", () => {
    it("wraps unknown Error as UnexpectedError preserving original", () => {
      const unknown = new TypeError("something weird");
      const result = translateRepositoryError(unknown);
      expect(result).toBeInstanceOf(UnexpectedError);
      expect((result as UnexpectedError).originalError).toBe(unknown);
    });

    it("wraps non-Error as UnexpectedError", () => {
      const result = translateRepositoryError(
        "string error" as unknown as Error,
      );
      expect(result).toBeInstanceOf(UnexpectedError);
    });
  });
});
