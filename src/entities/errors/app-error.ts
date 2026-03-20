export type AppErrorCode =
  | "VALIDATION"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TRANSIENT"
  | "UNEXPECTED";

export abstract class AppError extends Error {
  abstract readonly code: AppErrorCode;
  abstract readonly httpStatus: number;
  abstract readonly isTransient: boolean;

  readonly reason: string;
  readonly detail: string;

  constructor(reason: string, detail: string, internalMessage?: string) {
    super(internalMessage ?? detail);
    this.name = this.constructor.name;
    this.reason = reason;
    this.detail = detail;
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION" as const;
  readonly httpStatus = 400;
  readonly isTransient = false;
  readonly details?: unknown[];

  constructor(
    reason: string,
    detail: string,
    internalMessage?: string,
    details?: unknown[],
  ) {
    super(reason, detail, internalMessage);
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  readonly code = "AUTHENTICATION" as const;
  readonly httpStatus = 401;
  readonly isTransient = false;
}

export class AuthorizationError extends AppError {
  readonly code = "AUTHORIZATION" as const;
  readonly httpStatus = 403;
  readonly isTransient = false;
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND" as const;
  readonly httpStatus = 404;
  readonly isTransient = false;
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT" as const;
  readonly httpStatus = 409;
  readonly isTransient = false;
}

export class TransientError extends AppError {
  readonly code = "TRANSIENT" as const;
  readonly httpStatus = 503;
  readonly isTransient = true;
  readonly source?: string;
  readonly retryable?: boolean;

  constructor(
    reason: string,
    detail: string,
    internalMessage?: string,
    options?: { source?: string; retryable?: boolean },
  ) {
    super(reason, detail, internalMessage);
    this.source = options?.source;
    this.retryable = options?.retryable;
  }
}

export class UnexpectedError extends AppError {
  readonly code = "UNEXPECTED" as const;
  readonly httpStatus = 500;
  readonly isTransient = false;
  readonly originalError?: unknown;

  constructor(
    reason: string,
    detail: string,
    internalMessage?: string,
    originalError?: unknown,
  ) {
    super(reason, detail, internalMessage);
    this.originalError = originalError;
  }
}
