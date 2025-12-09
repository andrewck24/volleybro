"use client";

import type { Locale, Namespace } from "@/lib/i18n/config";
import { defaultLocale, locales, namespaces } from "@/lib/i18n/config";
import type { TranslationResult } from "@/lib/i18n/types";
import i18next from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { initReactI18next, useTranslation } from "react-i18next";

// Initialize i18next once
const runsOnServerSide = typeof window === "undefined";

i18next
  .use(initReactI18next)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`locales/${language}/${namespace}.json`),
    ),
  )
  .init({
    lng: undefined, // let detect the language on client side
    fallbackLng: defaultLocale,
    supportedLngs: locales as readonly string[],
    defaultNS: namespaces[0],
    fallbackNS: namespaces[0],
    ns: namespaces,
    preload: runsOnServerSide ? locales : [],
  });

const getLocaleFromPathname = (pathname: string): Locale => {
  if (!pathname || pathname === "" || pathname === "/") return defaultLocale;

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return defaultLocale;

  const localeSegment = segments[0];

  if (locales.includes(localeSegment as Locale)) {
    return localeSegment as Locale;
  }

  return defaultLocale;
};

export const useT = (
  ns: Namespace | Namespace[] = "common",
): TranslationResult => {
  const pathname = usePathname();
  const detectedLng = getLocaleFromPathname(pathname);
  const { t, i18n, ready } = useTranslation(Array.isArray(ns) ? ns : [ns]);
  const [activeLng, setActiveLng] = useState<Locale>(
    (i18n?.resolvedLanguage as Locale) || detectedLng,
  );

  useEffect(() => {
    if (!i18n || detectedLng === activeLng) return;

    setActiveLng(detectedLng);
    i18n.changeLanguage(detectedLng).catch((error) => {
      // Handle language change failures gracefully
      console.warn("Failed to change language:", error);
    });
  }, [detectedLng, activeLng, i18n]);

  return {
    t,
    lng: activeLng,
    ready,
    i18n,
  };
};
