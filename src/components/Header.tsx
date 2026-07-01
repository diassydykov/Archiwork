"use client";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useAuth } from "@/lib/auth/context";
import { useI18n } from "@/lib/i18n/context";
import { useRouter } from "next/navigation";

interface HeaderProps {
  showLogout?: boolean;
}

export function Header({ showLogout = false }: HeaderProps) {
  const { logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold"
          style={{
            backgroundColor: "var(--accent)",
            color: "#fff",
          }}
        >
          A
        </div>
        <span
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Archiwork
        </span>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeSwitcher />
        {showLogout && (
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {t("logout")}
          </button>
        )}
      </div>
    </header>
  );
}
