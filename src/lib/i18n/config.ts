export const locales = ["en", "zh-TW"] as const;
export const defaultLocale = "en";

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  "zh-TW": "繁體中文",
};

export const namespaces = ["common"] as const;
export type Namespace = (typeof namespaces)[number];
