export type AppErrorCode =
  | "NOT_FOUND"
  | "VALIDATION"
  | "AUTHORIZATION"
  | "CONFLICT"
  | "TRANSIENT";

export abstract class AppError extends Error {
  abstract readonly code: AppErrorCode;
  abstract readonly isTransient: boolean;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND" as const;
  readonly isTransient = false;
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION" as const;
  readonly isTransient = false;
}

export class AuthorizationError extends AppError {
  readonly code = "AUTHORIZATION" as const;
  readonly isTransient = false;
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT" as const;
  readonly isTransient = false;
}

export class TransientError extends AppError {
  readonly code = "TRANSIENT" as const;
  readonly isTransient = true;
}
