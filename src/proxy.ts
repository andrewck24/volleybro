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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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
