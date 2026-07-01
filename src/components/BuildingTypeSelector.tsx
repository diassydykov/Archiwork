"use client";

import { useI18n } from "@/lib/i18n/context";
import type { BuildingType } from "@/types";

interface BuildingTypeSelectorProps {
  selected: BuildingType | null;
  onSelect: (type: BuildingType) => void;
}

export function BuildingTypeSelector({
  selected,
  onSelect,
}: BuildingTypeSelectorProps) {
  const { t } = useI18n();

  const options: {
    type: BuildingType;
    icon: string;
    titleKey: "residential" | "commercial";
    descKey: "residentialDesc" | "commercialDesc";
  }[] = [
    {
      type: "residential",
      icon: "🏠",
      titleKey: "residential",
      descKey: "residentialDesc",
    },
    {
      type: "commercial",
      icon: "🏢",
      titleKey: "commercial",
      descKey: "commercialDesc",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map(({ type, icon, titleKey, descKey }) => {
        const isSelected = selected === type;
        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="group flex flex-col items-start gap-3 rounded-2xl p-6 text-left transition-all duration-200"
            style={{
              backgroundColor: isSelected
                ? "var(--accent-light)"
                : "var(--bg-secondary)",
              border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
              boxShadow: isSelected ? "var(--shadow)" : "none",
            }}
            aria-pressed={isSelected}
          >
            <span className="text-3xl" aria-hidden="true">
              {icon}
            </span>
            <div>
              <h3
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {t(titleKey)}
              </h3>
              <p
                className="mt-1 text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {t(descKey)}
              </p>
            </div>
            {isSelected && (
              <span
                className="mt-auto text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--accent)" }}
              >
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
