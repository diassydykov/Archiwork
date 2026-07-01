"use client";

import { useI18n } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import type { Theme } from "@/types";

const themes: { value: Theme; icon: string; labelKey: "themeLight" | "themeDark" | "themeAccessible" }[] = [
  { value: "light", icon: "☀", labelKey: "themeLight" },
  { value: "dark", icon: "☾", labelKey: "themeDark" },
  { value: "accessible", icon: "◎", labelKey: "themeAccessible" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <div
      className="flex gap-1 rounded-lg p-1"
      style={{ backgroundColor: "var(--bg-accent)" }}
      role="group"
      aria-label={t("theme")}
    >
      {themes.map(({ value, icon, labelKey }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className="rounded-md px-2.5 py-1 text-sm font-medium transition-all"
          style={{
            backgroundColor: theme === value ? "var(--accent)" : "transparent",
            color: theme === value ? "#fff" : "var(--text-secondary)",
          }}
          title={t(labelKey)}
          aria-pressed={theme === value}
          aria-label={t(labelKey)}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
