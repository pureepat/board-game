"use client";

import { useLocaleStore } from "@/store/useLocaleStore";
import { translations } from "@/lib/i18n/translations";

function getByPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
}

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  function t(key: string, vars?: Record<string, string | number>): string {
    let raw = getByPath((translations as any)[locale], key);
    if (raw === undefined) raw = getByPath(translations.en, key); // fall back to English for any gap
    if (typeof raw !== "string") return key;
    return interpolate(raw, vars);
  }

  /** Looks up `${key}_one` for count === 1, `${key}_other` otherwise, with `count` auto-injected. */
  function tp(key: string, count: number, vars?: Record<string, string | number>): string {
    const suffix = count === 1 ? "_one" : "_other";
    return t(`${key}${suffix}`, { count, ...vars });
  }

  return { t, tp, locale, setLocale };
}
