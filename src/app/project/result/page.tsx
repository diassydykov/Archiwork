"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import type { ProjectDetails } from "@/types";

export default function ProjectResultPage() {
  return (
    <AuthGuard>
      <ResultContent />
    </AuthGuard>
  );
}

function ResultContent() {
  const { t } = useI18n();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [provider, setProvider] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = useCallback(async (projectData: ProjectDetails) => {
    setLoading(true);
    setError("");
    setImages([]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(projectData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("generationError"));
      }

      setImages(data.images);
      setProvider(data.provider ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("generationError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const raw = sessionStorage.getItem("archiwork-current-project");
    if (raw) {
      const parsed = JSON.parse(raw) as ProjectDetails;
      setProject(parsed);
      generate(parsed);
    } else {
      router.replace("/dashboard");
    }
  }, [router, generate]);

  if (!project) return null;

  return (
    <div
      className="flex min-h-screen flex-col px-4"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <Header showLogout />

        <main className="flex flex-1 flex-col py-8">
          <div className="animate-fade-in mb-6">
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {project.buildingType === "residential"
                ? t("residentialProject")
                : t("commercialProject")}
            </h1>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {project.description}
            </p>
          </div>

          {loading && (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl p-12"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
                style={{
                  borderColor: "var(--accent)",
                  borderTopColor: "transparent",
                }}
              />
              <p style={{ color: "var(--text-primary)" }}>{t("generating")}</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {t("generatingHint")}
              </p>
            </div>
          )}

          {error && !loading && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <p className="mb-4" style={{ color: "#dc2626" }}>
                {error}
              </p>
              <Button onClick={() => generate(project)}>{t("retry")}</Button>
            </div>
          )}

          {images.length > 0 && !loading && (
            <div className="animate-slide-up flex flex-col gap-6">
              <h2
                className="text-lg font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {t("yourVisualization")}
              </h2>
              <div
                className="overflow-hidden rounded-2xl"
                style={{
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow)",
                }}
              >
                <Image
                  src={images[0]}
                  alt={project.description}
                  width={1024}
                  height={768}
                  className="h-auto w-full"
                  unoptimized
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                {provider && (
                  <p className="text-xs sm:self-center" style={{ color: "var(--text-muted)" }}>
                    {t("poweredBy")}: {provider === "leonardo" ? "Leonardo AI" : "Stability AI"}
                  </p>
                )}
                <Button
                  variant="secondary"
                  onClick={() => router.push("/dashboard")}
                >
                  {t("newProject")}
                </Button>
                <Button onClick={() => generate(project)}>{t("retry")}</Button>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
