import { describe, expect, it } from "@jest/globals";
import {
  AppError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  TransientError,
  ValidationError,
} from "@/applications/errors/app-error";

describe("AppError hierarchy", () => {
  describe("NotFoundError", () => {
    it("should have correct code and isTransient", () => {
      const error = new NotFoundError("Player not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.isTransient).toBe(false);
      expect(error.message).toBe("Player not found");
    });

    it("should be instanceof AppError and Error", () => {
      const error = new NotFoundError("not found");
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("ValidationError", () => {
    it("should have correct code and isTransient", () => {
      const error = new ValidationError("Invalid status");
      expect(error.code).toBe("VALIDATION");
      expect(error.isTransient).toBe(false);
      expect(error.message).toBe("Invalid status");
    });

    it("should be instanceof AppError and Error", () => {
      const error = new ValidationError("bad input");
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("AuthorizationError", () => {
    it("should have correct code and isTransient", () => {
      const error = new AuthorizationError("Access denied");
      expect(error.code).toBe("AUTHORIZATION");
      expect(error.isTransient).toBe(false);
      expect(error.message).toBe("Access denied");
    });

    it("should be instanceof AppError and Error", () => {
      const error = new AuthorizationError("denied");
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("ConflictError", () => {
    it("should have correct code and isTransient", () => {
      const error = new ConflictError("Duplicate entry");
      expect(error.code).toBe("CONFLICT");
      expect(error.isTransient).toBe(false);
      expect(error.message).toBe("Duplicate entry");
    });

    it("should be instanceof AppError and Error", () => {
      const error = new ConflictError("conflict");
      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("TransientError", () => {
    it("should have correct code and isTransient", () => {
      const error = new TransientError("DB connection lost");
      expect(error.code).toBe("TRANSIENT");
      expect(error.isTransient).toBe(true);
      expect(error.message).toBe("DB connection lost");
    });

    it("should be instanceof AppError and Error", () => {
      const error = new TransientError("transient");
      expect(error).toBeInstanceOf(TransientError);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("cross-class instanceof", () => {
    it("should not match across sibling classes", () => {
      const error = new NotFoundError("not found");
      expect(error).not.toBeInstanceOf(ValidationError);
      expect(error).not.toBeInstanceOf(TransientError);
    });
  });
});
