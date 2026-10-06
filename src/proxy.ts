import { getSessionCookie } from "better-auth/cookies";
import { AuthReason } from "@/entities/errors";
import { auth } from "@/lib/auth";
import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_SIGN_IN_REDIRECT,
  publicRoutes,
} from "@/lib/features/auth/routes";
import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { nextUrl } = request;

  // API authentication gate (Edge Runtime optimistic check).
  // /api/auth/* is excluded — auth routes must be reachable without a session.
  // The withAuth wrapper performs definitive session validation in Node runtime.
  if (
    nextUrl.pathname.startsWith("/api") &&
    !nextUrl.pathname.startsWith(apiAuthPrefix)
  ) {
    const sessionToken = getSessionCookie(request);
    if (!sessionToken) {
      return NextResponse.json(
        { code: "AUTHENTICATION", reason: AuthReason.SESSION_REQUIRED },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  if (nextUrl.pathname.startsWith("/apple-splash/")) {
    return NextResponse.next();
  }

  // PROTOTYPE: `/?variant=v1|v2` shows a landing prototype; `/` itself stays
  // the static current landing.
  const variant = nextUrl.searchParams.get("variant");
  if (nextUrl.pathname === "/" && (variant === "v1" || variant === "v2")) {
    return NextResponse.rewrite(new URL(`/landing-${variant}`, nextUrl));
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Page-level auth (non-API routes reach here, plus /api/auth/* which
  // is excluded from the API gate above)
  const isSignedIn = !!session;
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  if (isApiAuthRoute) return NextResponse.next();

  if (isAuthRoute) {
    if (isSignedIn) {
      return NextResponse.redirect(new URL(DEFAULT_SIGN_IN_REDIRECT, nextUrl));
    }
    return NextResponse.next();
  }

  if (!isSignedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/sign-in", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
