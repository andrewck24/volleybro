import type { Locale, Namespace } from "@/lib/i18n/config";
import type { TFunction, i18n } from "i18next";

export interface I18nConfig {
  lng: Locale;
  fallbackLng: Locale;
  ns: Namespace | Namespace[];
  defaultNS: Namespace;
}

export interface GetTOptions {
  lng?: Locale;
  fallbackNS?: Namespace;
}

export interface TranslationResult {
  t: TFunction;
  lng: Locale;
  ready: boolean;
  i18n: i18n;
}
