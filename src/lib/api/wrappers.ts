import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError } from "zod";
import {
  AppError,
  UnexpectedError,
  ValidationError,
} from "@/entities/errors/app-error";
import { AuthReason } from "@/entities/errors/reasons/auth";
import { AuthenticationError } from "@/entities/errors/app-error";
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

function logError(error: unknown, req: NextRequest): void {
  const url = new URL(req.url);
  const base = {
    path: url.pathname,
    method: req.method,
    timestamp: new Date().toISOString(),
  };

  if (error instanceof AppError) {
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
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(
      JSON.stringify({
        level: "error",
        code: "UNEXPECTED",
        reason: "UNHANDLED_ERROR",
        message: err.message,
        stack: err.stack,
        ...base,
      }),
    );
  }
}

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      logError(error, req);

      if (error instanceof AppError) {
        return NextResponse.json(serializeError(error), {
          status: error.httpStatus,
        });
      }

      if (error instanceof ZodError) {
        const validationError = new ValidationError(
          "INVALID_INPUT",
          "Request data failed validation",
          undefined,
          error.issues,
        );
        return NextResponse.json(serializeError(validationError), {
          status: 400,
        });
      }

      return NextResponse.json(
        {
          code: "UNEXPECTED",
          reason: "UNHANDLED_ERROR",
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
