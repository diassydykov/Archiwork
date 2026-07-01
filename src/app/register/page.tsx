"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || user) return null;

  return (
    <div
      className="flex min-h-screen flex-col px-4"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center py-8">
          <AuthForm mode="register" />
        </main>
        <Footer />
      </div>
    </div>
  );
}
