"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Button } from "./ui/Button";
import type { BuildingType, ProjectDetails } from "@/types";

interface ProjectDetailsFormProps {
  buildingType: BuildingType;
  onSubmit: (details: Omit<ProjectDetails, "buildingType">) => void;
  onBack: () => void;
}

export function ProjectDetailsForm({
  buildingType,
  onSubmit,
  onBack,
}: ProjectDetailsFormProps) {
  const { t } = useI18n();

  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [floors, setFloors] = useState("");
  const [style, setStyle] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [wishes, setWishes] = useState("");
  const [additional, setAdditional] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError(t("fillRequired"));
      return;
    }
    setError("");
    onSubmit({
      description,
      area,
      floors,
      style,
      budget,
      location,
      wishes,
      additional,
    });
  };

  const projectTitle =
    buildingType === "residential"
      ? t("residentialProject")
      : t("commercialProject");

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in flex flex-col gap-5">
      <div>
        <h2
          className="text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {projectTitle}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("projectDetailsDesc")}
        </p>
      </div>

      <Textarea
        label={`${t("description")} *`}
        placeholder={t("descriptionPlaceholder")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("area")}
          placeholder={t("areaPlaceholder")}
          value={area}
          onChange={(e) => setArea(e.target.value)}
          type="text"
          inputMode="numeric"
        />
        <Input
          label={t("floors")}
          placeholder={t("floorsPlaceholder")}
          value={floors}
          onChange={(e) => setFloors(e.target.value)}
          type="text"
          inputMode="numeric"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("style")}
          placeholder={t("stylePlaceholder")}
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        />
        <Input
          label={t("budget")}
          placeholder={t("budgetPlaceholder")}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </div>

      <Input
        label={t("location")}
        placeholder={t("locationPlaceholder")}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />

      <Textarea
        label={t("wishes")}
        placeholder={t("wishesPlaceholder")}
        value={wishes}
        onChange={(e) => setWishes(e.target.value)}
      />

      <Textarea
        label={t("additional")}
        placeholder={t("additionalPlaceholder")}
        value={additional}
        onChange={(e) => setAdditional(e.target.value)}
      />

      {error && (
        <p className="text-sm" style={{ color: "#dc2626" }} role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          {t("back")}
        </Button>
        <Button type="submit">{t("generate")}</Button>
      </div>
    </form>
  );
}
