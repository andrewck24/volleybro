import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError } from "zod";
import {
  AppError,
  AuthenticationError,
  UnexpectedError,
  ValidationError,
} from "@/entities/errors/app-error";
import { AuthReason } from "@/entities/errors/reasons/auth";
import { CommonReason } from "@/entities/errors/reasons/common";
import { auth } from "@/lib/auth";

type RouteHandler = (req: NextRequest) => Promise<NextResponse>;
type AuthedRouteHandler = (
  req: NextRequest,
  ctx: { userId: string },
) => Promise<NextResponse>;

function serializeError(error: AppError): Record<string, unknown> {
  const body: Record<string, unknown> = {
    code: error.code,
    reason: error.reason,
    detail: error.detail,
  };
  if (error instanceof ValidationError && error.details !== undefined) {
    body.details = error.details;
  }
  return body;
}

function logError(error: AppError | Error, req: NextRequest): void {
  const url = new URL(req.url);
  const base = {
    path: url.pathname,
    method: req.method,
    timestamp: new Date().toISOString(),
  };

  if (error instanceof UnexpectedError) {
    const original =
      error.originalError instanceof Error ? error.originalError : error;
    console.error(
      JSON.stringify({
        level: "error",
        code: error.code,
        reason: error.reason,
        message: error.message,
        stack: original.stack,
        ...base,
      }),
    );
  } else if (error instanceof AppError) {
    console.error(
      JSON.stringify({
        level: "warn",
        code: error.code,
        reason: error.reason,
        message: error.message,
        ...base,
      }),
    );
  } else {
    console.error(
      JSON.stringify({
        level: "error",
        code: "UNEXPECTED",
        reason: CommonReason.UNHANDLED_ERROR,
        message: error.message,
        stack: error.stack,
        ...base,
      }),
    );
  }
}

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (raw) {
      // Normalize error before logging so ZodError logs as warn, not error
      let error: AppError | Error;
      if (raw instanceof AppError) {
        error = raw;
      } else if (raw instanceof ZodError) {
        error = new ValidationError(
          CommonReason.INVALID_INPUT,
          "Request data failed validation",
          undefined,
          raw.issues,
        );
      } else {
        error = new UnexpectedError(
          CommonReason.UNHANDLED_ERROR,
          "An unexpected error occurred",
          raw instanceof Error ? raw.message : String(raw),
          raw,
        );
      }

      logError(error, req);

      if (error instanceof AppError) {
        return NextResponse.json(serializeError(error), {
          status: error.httpStatus,
        });
      }

      // Unreachable: all paths above produce an AppError, but TypeScript needs this
      return NextResponse.json(
        {
          code: "UNEXPECTED",
          reason: CommonReason.UNHANDLED_ERROR,
          detail: "An unexpected error occurred",
        },
        { status: 500 },
      );
    }
  };
}

export function withAuth(handler: AuthedRouteHandler): RouteHandler {
  return withErrorHandler(async (req: NextRequest) => {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      throw new AuthenticationError(
        AuthReason.SESSION_REQUIRED,
        "Authentication is required to access this resource",
      );
    }

    return handler(req, { userId: session.user.id });
  });
}
