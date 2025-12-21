/**
 * T122: API Error Classes Tests
 *
 * Note: We only test the error classes here, not the handleApiError function
 * which depends on NextResponse (server-side only). Integration tests for
 * handleApiError would need to be in a separate Node.js test environment.
 */

import {
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  InternalServerError,
  isApiError,
} from "../api-error";

describe("API Error Classes", () => {
  describe("Error Hierarchy", () => {
    it("should create ValidationError with correct properties", () => {
      const error = new ValidationError(
        "Email is invalid",
        "Please enter a valid email address"
      );
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Email is invalid");
      expect(error.userMessage).toBe("Please enter a valid email address");
      expect(error.name).toBe("ValidationError");
      expect(error instanceof ApiError).toBe(true);
    });

    it("should create AuthenticationError with correct properties", () => {
      const error = new AuthenticationError();
      expect(error.statusCode).toBe(401);
      expect(error.userMessage).toBe("You need to log in to access this resource");
      expect(error.name).toBe("AuthenticationError");
      expect(error instanceof ApiError).toBe(true);
    });

    it("should create AuthorizationError with correct properties", () => {
      const error = new AuthorizationError();
      expect(error.statusCode).toBe(403);
      expect(error.userMessage).toBe("You don't have permission to access this resource");
      expect(error.name).toBe("AuthorizationError");
      expect(error instanceof ApiError).toBe(true);
    });

    it("should create NotFoundError with correct properties", () => {
      const error = new NotFoundError("Player");
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Player not found");
      expect(error.userMessage).toBe("Player not found");
      expect(error.name).toBe("NotFoundError");
      expect(error instanceof ApiError).toBe(true);
    });

    it("should create ConflictError with correct properties", () => {
      const error = new ConflictError("Email already invited");
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("Email already invited");
      expect(error.name).toBe("ConflictError");
      expect(error instanceof ApiError).toBe(true);
    });

    it("should create BusinessRuleError with correct properties", () => {
      const error = new BusinessRuleError(
        "Owner cannot be removed",
        "The team owner cannot be removed"
      );
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe("Owner cannot be removed");
      expect(error.userMessage).toBe("The team owner cannot be removed");
      expect(error.name).toBe("BusinessRuleError");
      expect(error instanceof ApiError).toBe(true);
    });

    it("should create InternalServerError with correct properties", () => {
      const error = new InternalServerError();
      expect(error.statusCode).toBe(500);
      expect(error.userMessage).toBe(
        "An unexpected error occurred. Please try again later."
      );
      expect(error.name).toBe("InternalServerError");
      expect(error instanceof ApiError).toBe(true);
    });

    it("should allow custom user messages in NotFoundError", () => {
      const error = new NotFoundError("Team", "The team you're looking for doesn't exist");
      expect(error.userMessage).toBe("The team you're looking for doesn't exist");
    });
  });

  describe("isApiError type guard", () => {
    it("should return true for ApiError instances", () => {
      const error = new ValidationError("Test");
      expect(isApiError(error)).toBe(true);
    });

    it("should return true for all ApiError subclasses", () => {
      expect(isApiError(new ValidationError("Test"))).toBe(true);
      expect(isApiError(new AuthenticationError())).toBe(true);
      expect(isApiError(new AuthorizationError())).toBe(true);
      expect(isApiError(new NotFoundError("Test"))).toBe(true);
      expect(isApiError(new ConflictError("Test"))).toBe(true);
      expect(isApiError(new BusinessRuleError("Test"))).toBe(true);
      expect(isApiError(new InternalServerError())).toBe(true);
    });

    it("should return false for non-ApiError instances", () => {
      const error = new Error("Test");
      expect(isApiError(error)).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
    });

    it("should return false for primitive types", () => {
      expect(isApiError("error string")).toBe(false);
      expect(isApiError(123)).toBe(false);
      expect(isApiError(true)).toBe(false);
      expect(isApiError({})).toBe(false);
    });
  });

  describe("Error messages", () => {
    it("should preserve internal message and user message separately", () => {
      const error = new ValidationError(
        "Invalid email format detected in input",
        "Please enter a valid email address"
      );
      // Internal message for logging
      expect(error.message).toBe("Invalid email format detected in input");
      // User-friendly message for API response
      expect(error.userMessage).toBe("Please enter a valid email address");
    });

    it("should default user message to internal message when not provided", () => {
      const error = new AuthenticationError();
      expect(error.userMessage).toBe("You need to log in to access this resource");
    });

    it("should support details/additional error information", () => {
      const details = [{ field: "email", issue: "invalid format" }];
      const error = new ValidationError("Validation failed", undefined, details);
      expect(error.details).toEqual(details);
    });
  });
});
