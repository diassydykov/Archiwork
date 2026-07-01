"use client";

import { useI18n } from "@/lib/i18n/context";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer
      className="mt-auto py-6 text-center text-sm"
      style={{ color: "var(--text-muted)" }}
    >
      <p>{t("designedBy")}</p>
    </footer>
  );
}
