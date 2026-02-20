/**
 * T122: Unified API Error Classes
 *
 * Custom error hierarchy for API error handling
 * Enables consistent error responses across all routes
 */

/**
 * Base API Error
 * All API errors should extend this class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public userMessage?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Validation Error (400)
 * Thrown when request data validation fails
 */
export class ValidationError extends ApiError {
  constructor(message: string, userMessage?: string, details?: unknown) {
    super(400, message, userMessage || "Invalid request data", details);
    this.name = "ValidationError";
  }
}

/**
 * Authentication Error (401)
 * Thrown when user is not authenticated
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = "Authentication required") {
    super(401, message, "You need to log in to access this resource");
    this.name = "AuthenticationError";
  }
}

/**
 * Authorization Error (403)
 * Thrown when user doesn't have permission to access resource
 */
export class AuthorizationError extends ApiError {
  constructor(
    message: string = "Access denied",
    userMessage: string = "You don't have permission to access this resource"
  ) {
    super(403, message, userMessage);
    this.name = "AuthorizationError";
  }
}

/**
 * Not Found Error (404)
 * Thrown when requested resource doesn't exist
 */
export class NotFoundError extends ApiError {
  constructor(
    resource: string = "Resource",
    userMessage?: string
  ) {
    super(
      404,
      `${resource} not found`,
      userMessage || `${resource} not found`
    );
    this.name = "NotFoundError";
  }
}

/**
 * Conflict Error (409)
 * Thrown when there's a conflict (e.g., duplicate entry, state conflict)
 */
export class ConflictError extends ApiError {
  constructor(message: string, userMessage?: string) {
    super(409, message, userMessage || message);
    this.name = "ConflictError";
  }
}

/**
 * Business Rule Error (422)
 * Thrown when business logic validation fails
 */
export class BusinessRuleError extends ApiError {
  constructor(message: string, userMessage?: string) {
    super(422, message, userMessage || message);
    this.name = "BusinessRuleError";
  }
}

/**
 * Internal Server Error (500)
 * Thrown for unexpected server errors
 */
export class InternalServerError extends ApiError {
  constructor(message: string = "An unexpected error occurred") {
    super(
      500,
      message,
      "An unexpected error occurred. Please try again later."
    );
    this.name = "InternalServerError";
  }
}

/**
 * Type guard for ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
