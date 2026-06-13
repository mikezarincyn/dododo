// Минимальный i18n-слой, RTL-ready. Стадия 1 = только EN-UK; добавление локалей
// и RTL (напр. ar) — без правки компонентов: новый словарь + флаг в RTL_LOCALES.

import { en, type Strings } from "./en";

export type Locale = "en";

const dictionaries: Record<Locale, Strings> = { en };
const RTL_LOCALES = new Set<Locale>([]); // напр. в будущем: "ar", "he"

let current: Locale = "en";

export function setLocale(locale: Locale): void {
  current = locale;
}

export function getDir(): "ltr" | "rtl" {
  return RTL_LOCALES.has(current) ? "rtl" : "ltr";
}

export function t(): Strings {
  return dictionaries[current];
}
