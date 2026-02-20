import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { AuthenticationError } from '@/lib/errors';

/**
 * T125: API Authentication Helper
 *
 * Extracts repeated authentication/authorization verification logic
 * Used by all API routes to verify user session and permission
 */

/**
 * Verify user session and return userId
 * Throws AuthenticationError if session is invalid or missing
 *
 * Usage in API routes:
 * ```typescript
 * const userId = await verifyUserSession();
 * ```
 */
export async function verifyUserSession(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  return session.user.id;
}

/**
 * Verify user session and return error response if invalid
 * For use in API routes that need to return early
 *
 * Usage:
 * ```typescript
 * const userIdOrResponse = await verifyUserSessionOrRespond();
 * if (userIdOrResponse instanceof NextResponse) {
 *   return userIdOrResponse;
 * }
 * const userId = userIdOrResponse;
 * ```
 */
export async function verifyUserSessionOrRespond(): Promise<string | NextResponse> {
  try {
    return await verifyUserSession();
  } catch {
    return new NextResponse(
      JSON.stringify({
        error: 'AuthenticationError',
        message: 'You need to log in to access this resource',
        statusCode: 401,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
