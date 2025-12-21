/**
 * T122: API Error Handler
 *
 * Centralized error handling for API routes
 * Converts various error types into consistent API responses
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ApiError,
  isApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  InternalServerError,
} from "./api-error";

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  statusCode: number;
}

/**
 * Handle any error and return a standardized NextResponse
 *
 * @param error - The error to handle
 * @param context - Optional context for logging
 * @returns NextResponse with appropriate status code and error details
 */
export function handleApiError(
  error: unknown,
  context?: string
): NextResponse<ApiErrorResponse> {
  // Log the error (context helps with debugging)
  if (context) {
    console.error(`[${context}] Error:`, error);
  } else {
    console.error("API Error:", error);
  }

  // Handle ApiError subclasses
  if (isApiError(error)) {
    return NextResponse.json(
      {
        error: error.name,
        message: error.userMessage || error.message,
        details: error.details,
        statusCode: error.statusCode,
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = new ValidationError(
      "Validation failed",
      "Please check your input and try again",
      error.issues
    );
    return NextResponse.json(
      {
        error: validationError.name,
        message: validationError.userMessage,
        details: validationError.details,
        statusCode: validationError.statusCode,
      },
      { status: validationError.statusCode }
    );
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    // Try to infer error type from message
    const message = error.message.toLowerCase();

    if (message.includes("not found")) {
      const notFoundError = new NotFoundError("Resource");
      return NextResponse.json(
        {
          error: notFoundError.name,
          message: notFoundError.userMessage,
          statusCode: notFoundError.statusCode,
        },
        { status: notFoundError.statusCode }
      );
    }

    if (
      message.includes("unauthorized") ||
      message.includes("not authenticated")
    ) {
      const authError = new AuthenticationError();
      return NextResponse.json(
        {
          error: authError.name,
          message: authError.userMessage,
          statusCode: authError.statusCode,
        },
        { status: authError.statusCode }
      );
    }

    if (
      message.includes("forbidden") ||
      message.includes("not authorized") ||
      message.includes("not admin") ||
      message.includes("permission denied")
    ) {
      const authzError = new AuthorizationError();
      return NextResponse.json(
        {
          error: authzError.name,
          message: authzError.userMessage,
          statusCode: authzError.statusCode,
        },
        { status: authzError.statusCode }
      );
    }

    if (
      message.includes("already exists") ||
      message.includes("duplicate") ||
      message.includes("conflict")
    ) {
      const conflictError = new ConflictError(
        error.message,
        "This resource already exists"
      );
      return NextResponse.json(
        {
          error: conflictError.name,
          message: conflictError.userMessage,
          statusCode: conflictError.statusCode,
        },
        { status: conflictError.statusCode }
      );
    }

    // Default to internal server error for unknown Error types
    const serverError = new InternalServerError(error.message);
    return NextResponse.json(
      {
        error: serverError.name,
        message: serverError.userMessage,
        statusCode: serverError.statusCode,
      },
      { status: serverError.statusCode }
    );
  }

  // Handle unknown error types
  const unknownError = new InternalServerError(
    "Unknown error occurred"
  );
  return NextResponse.json(
    {
      error: unknownError.name,
      message: unknownError.userMessage,
      statusCode: unknownError.statusCode,
    },
    { status: unknownError.statusCode }
  );
}

/**
 * Wrapper for API route handlers to catch and handle errors
 * Usage: export const POST = withErrorHandler(async (req) => { ... })
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<unknown>>
) {
  return async (...args: T): Promise<NextResponse<unknown>> => {
    try {
      return await handler(...args);
    } catch (error) {
      const functionName = handler.name || "ApiRoute";
      return handleApiError(error, functionName);
    }
  };
}
