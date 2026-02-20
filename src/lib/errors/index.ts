/**
 * API Error Handling Exports
 */

export {
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  InternalServerError,
  isApiError,
} from "./api-error";

export {
  handleApiError,
  withErrorHandler,
  type ApiErrorResponse,
} from "./handle-api-error";
