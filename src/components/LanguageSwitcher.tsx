"use client";

import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/types";

const locales: { code: Locale; label: string }[] = [
  { code: "kk", label: "ҚАЗ" },
  { code: "ru", label: "РУС" },
  { code: "en", label: "ENG" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className="flex gap-1 rounded-lg p-1"
      style={{ backgroundColor: "var(--bg-accent)" }}
      role="group"
      aria-label="Language"
    >
      {locales.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          className="rounded-md px-2.5 py-1 text-sm font-medium transition-all"
          style={{
            backgroundColor: locale === code ? "var(--accent)" : "transparent",
            color: locale === code ? "#fff" : "var(--text-secondary)",
          }}
          aria-pressed={locale === code}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
