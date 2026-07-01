"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BuildingTypeSelector } from "@/components/BuildingTypeSelector";
import { ProjectDetailsForm } from "@/components/ProjectDetailsForm";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/context";
import { useI18n } from "@/lib/i18n/context";
import type { BuildingType, ProjectDetails } from "@/types";

type Step = "type" | "details";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [buildingType, setBuildingType] = useState<BuildingType | null>(null);

  const handleContinue = () => {
    if (!buildingType) return;
    setStep("details");
  };

  const handleSubmit = (details: Omit<ProjectDetails, "buildingType">) => {
    const project: ProjectDetails = {
      buildingType: buildingType!,
      ...details,
    };
    sessionStorage.setItem("archiwork-current-project", JSON.stringify(project));
    router.push("/project/result");
  };

  return (
    <div
      className="flex min-h-screen flex-col px-4"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <Header showLogout />

        <main className="flex flex-1 flex-col py-8">
          <div className="animate-fade-in mb-8">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {t("hello")}, {user?.name}
            </p>
            <h1
              className="mt-1 text-2xl font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {step === "type" ? t("chooseBuildingType") : t("projectDetails")}
            </h1>
          </div>

          {step === "type" && (
            <div className="animate-slide-up flex flex-1 flex-col gap-8">
              <BuildingTypeSelector
                selected={buildingType}
                onSelect={setBuildingType}
              />
              <div className="mt-auto">
                <Button
                  fullWidth
                  onClick={handleContinue}
                  disabled={!buildingType}
                >
                  {t("continue")}
                </Button>
              </div>
            </div>
          )}

          {step === "details" && buildingType && (
            <div
              className="rounded-2xl p-6 sm:p-8"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
              }}
            >
              <ProjectDetailsForm
                buildingType={buildingType}
                onSubmit={handleSubmit}
                onBack={() => setStep("type")}
              />
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
