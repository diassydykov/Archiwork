"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { useI18n } from "@/lib/i18n/context";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Logo } from "./Logo";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const { login, register } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || (mode === "register" && !name)) {
      setError(t("fillRequired"));
      return;
    }

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError(t("passwordsMismatch"));
        return;
      }
      const err = register(name, email, password);
      if (err) {
        setError(t(err as "emailExists"));
        return;
      }
    } else {
      const err = login(email, password);
      if (err) {
        setError(t(err as "invalidCredentials"));
        return;
      }
    }

    router.push("/dashboard");
  };

  return (
    <div
      className="animate-slide-up w-full max-w-md rounded-2xl p-8"
      style={{
        backgroundColor: "var(--bg-secondary)",
        boxShadow: "var(--shadow)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="mb-8 text-center">
        <div className="mb-6 flex justify-center">
          <Logo size={96} linkToHome={false} />
        </div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {mode === "login" ? t("welcomeBack") : t("welcome")}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("appTagline")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "register" && (
          <Input
            label={t("name")}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        )}
        <Input
          label={t("email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Input
          label={t("password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
        {mode === "register" && (
          <Input
            label={t("confirmPassword")}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        )}

        {error && (
          <p
            className="rounded-lg px-4 py-2 text-sm"
            style={{
              backgroundColor: "rgba(220,38,38,0.1)",
              color: "#dc2626",
            }}
            role="alert"
          >
            {error}
          </p>
        )}

        <Button type="submit" fullWidth className="mt-2">
          {mode === "login" ? t("signIn") : t("signUp")}
        </Button>
      </form>

      <p
        className="mt-6 text-center text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        {mode === "login" ? t("noAccount") : t("hasAccount")}{" "}
        <Link
          href={mode === "login" ? "/register" : "/login"}
          className="font-medium underline-offset-2 hover:underline"
          style={{ color: "var(--accent)" }}
        >
          {mode === "login" ? t("signUp") : t("signIn")}
        </Link>
      </p>
    </div>
  );
}
