import type { Locale, Namespace } from "@/lib/i18n/config";
import { defaultLocale, locales, namespaces } from "@/lib/i18n/config";
import type { GetTOptions } from "@/lib/i18n/types";
import { createInstance, type i18n, type InitOptions } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { headers } from "next/headers";

// Create a shared i18next instance for server-side translations
const createI18nInstance = async (): Promise<i18n> => {
  const i18nInstance = createInstance();

  await i18nInstance
    .use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`locales/${language}/${namespace}.json`),
      ),
    )
    .init({
      fallbackLng: defaultLocale,
      supportedLngs: locales as readonly string[],
      defaultNS: namespaces[0],
      fallbackNS: namespaces[0],
      ns: namespaces,
      preload: locales as readonly string[],
    } as InitOptions);

  return i18nInstance;
};

// Shared instance that gets reused
let i18nInstance: i18n | null = null;
let initPromise: Promise<i18n> | null = null;

const getI18nInstance = async (): Promise<i18n> => {
  if (!i18nInstance) {
    if (!initPromise) {
      initPromise = createI18nInstance();
    }
    i18nInstance = await initPromise;
  }
  return i18nInstance;
};

const validateAndSanitizeLocale = (locale: string | null | undefined): Locale => {
  // Handle null/undefined
  if (!locale) return defaultLocale;
  
  // Check if locale is in supported list
  if (locales.includes(locale as Locale)) {
    return locale as Locale;
  }
  
  // Fallback to default for any invalid/unsupported locale
  return defaultLocale;
}

export const getT = async (
  ns: Namespace | Namespace[] = "common",
  options?: GetTOptions,
) => {
  const headersList = await headers();
  const headerLng = headersList.get("x-lng");
  const optionLng = options?.lng;
  
  // Validate and sanitize the locale
  const lng = validateAndSanitizeLocale(optionLng || headerLng);

  const i18nextInstance = await getI18nInstance();

  // Change language if different from current
  if (lng && i18nextInstance.resolvedLanguage !== lng) {
    await i18nextInstance.changeLanguage(lng);
  }

  // Load additional namespaces if needed
  const namespacesToLoad = Array.isArray(ns) ? ns : [ns];
  const missingNamespaces = namespacesToLoad.filter(
    (namespace) => !i18nextInstance.hasResourceBundle(lng, namespace)
  );
  
  if (missingNamespaces.length > 0) {
    await i18nextInstance.loadNamespaces(missingNamespaces);
  }

  return {
    t: i18nextInstance.getFixedT(lng, Array.isArray(ns) ? ns[0] : ns),
    lng,
    ready: i18nextInstance.isInitialized,
    i18n: i18nextInstance,
  };
};