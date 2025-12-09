import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import {
  publicRoutes,
  authRoutes,
  apiAuthPrefix,
  DEFAULT_SIGN_IN_REDIRECT,
} from "@/lib/features/auth/routes";
import { locales, defaultLocale } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";

const { auth } = NextAuth(authConfig);

const extractLocaleFromPath = (pathname: string): Locale | null  => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  
  const potentialLocale = segments[0];
  if (locales.includes(potentialLocale as Locale)) {
    return potentialLocale as Locale;
  }
  return null;
}

const removeLocaleFromPath = (pathname: string, locale: Locale): string => {
  if (pathname.startsWith(`/${locale}`)) {
    const pathWithoutLocale = pathname.slice(`/${locale}`.length);
    return pathWithoutLocale || "/";
  }
  return pathname;
}

const detectUserLocale = (req: any): Locale => {
  // 1. Check if locale is already in pathname
  const pathnameLocale = extractLocaleFromPath(req.nextUrl.pathname);
  if (pathnameLocale) return pathnameLocale;
  
  // 2. Check Accept-Language header
  const acceptLanguage = req.headers.get("accept-language");
  if (acceptLanguage) {
    // Parse Accept-Language header and find best match
    const preferredLanguages = acceptLanguage
      .split(",")
      .map(lang => {
        const [locale, weight] = lang.trim().split(";q=");
        return {
          locale: locale.trim(),
          weight: weight ? parseFloat(weight) : 1.0
        };
      })
      .sort((a, b) => b.weight - a.weight);

    for (const { locale: preferredLocale } of preferredLanguages) {
      // Direct match
      if (locales.includes(preferredLocale as Locale)) {
        return preferredLocale as Locale;
      }
      // Language code match (e.g., "zh" for "zh-TW")
      const langCode = preferredLocale.split("-")[0];
      const matchingLocale = locales.find(l => l.startsWith(langCode));
      if (matchingLocale) return matchingLocale;      
    }
  }
  
  return defaultLocale;
}

export const middleware = auth((req) => {
  const { nextUrl } = req;
  const isSignedIn = !!req.auth;

  // Skip i18n processing for API routes and static assets
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isStaticAsset = nextUrl.pathname.includes('.') || 
                        nextUrl.pathname.startsWith('/_next/') ||
                        nextUrl.pathname.startsWith('/api/');
  
  if (isApiAuthRoute || isStaticAsset) return NextResponse.next();

  // Handle i18n routing
  const detectedLocale = detectUserLocale(req);
  const pathnameLocale = extractLocaleFromPath(nextUrl.pathname);
  
  // If no locale in pathname and not default locale, redirect with locale prefix
  if (!pathnameLocale && detectedLocale !== defaultLocale) {
    const newUrl = new URL(`/${detectedLocale}${nextUrl.pathname}${nextUrl.search}`, nextUrl);
    return NextResponse.redirect(newUrl);
  }
  
  // Remove locale from pathname for route checking
  const pathnameWithoutLocale = pathnameLocale 
    ? removeLocaleFromPath(nextUrl.pathname, pathnameLocale)
    : nextUrl.pathname;
  
  const isPublicRoute = publicRoutes.includes(pathnameWithoutLocale);
  const isAuthRoute = authRoutes.includes(pathnameWithoutLocale);

  if (isAuthRoute) {
    if (isSignedIn) {
      const redirectUrl = pathnameLocale 
        ? `/${pathnameLocale}${DEFAULT_SIGN_IN_REDIRECT}`
        : DEFAULT_SIGN_IN_REDIRECT;
      return NextResponse.redirect(new URL(redirectUrl, nextUrl));
    }
    // Continue processing with language header
    const response = NextResponse.next();
    response.headers.set('x-lng', detectedLocale);
    return response;
  }

  if (!isSignedIn && !isPublicRoute) {
    const signInUrl = pathnameLocale 
      ? `/${pathnameLocale}/auth/sign-in`
      : "/auth/sign-in";
    return NextResponse.redirect(new URL(signInUrl, nextUrl));
  }
  
  // Set language header for server-side translations
  const response = NextResponse.next();
  response.headers.set('x-lng', detectedLocale);
  return response;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
