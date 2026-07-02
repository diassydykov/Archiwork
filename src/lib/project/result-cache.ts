import type { SheetTitleKey } from "@/lib/ai/sheets";
import { getProjectSheets } from "@/lib/ai/sheets";
import { isVectorSheet } from "@/lib/layout/render-sheet";
import {
  getVectorFloorLevel,
  layoutHasFloor,
} from "@/lib/layout/summary";
import type { BuildingLayout } from "@/lib/layout/schema";
import type { ProjectDetails, ProjectSheetResult } from "@/types";

const CACHE_KEY = "archiwork-project-result";
const CACHE_VERSION = 2;

export interface ProjectResultCache {
  v: number;
  specification: string;
  designLock?: string;
  layout?: BuildingLayout;
  sheets: ProjectSheetResult[];
}

export function loadResultCache(): ProjectResultCache | null {
  const raw = sessionStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as ProjectResultCache;
    if (!data.specification || !data.sheets?.length) return null;
    return data;
  } catch {
    return null;
  }
}

/** Vector SVG data URLs are huge — keep layout and regenerate images on restore. */
export function saveResultCache(payload: {
  specification: string;
  designLock: string;
  layout: BuildingLayout;
  sheets: ProjectSheetResult[];
}): void {
  const light: ProjectResultCache = {
    v: CACHE_VERSION,
    specification: payload.specification,
    designLock: payload.designLock,
    layout: payload.layout,
    sheets: payload.sheets.map((sheet) => ({
      id: sheet.id,
      titleKey: sheet.titleKey,
      provider: sheet.provider,
      error: sheet.error,
      image:
        sheet.provider === "vector" || isVectorSheet(sheet.id)
          ? ""
          : sheet.image,
    })),
  };

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(light));
    return;
  } catch {
    /* QuotaExceeded — drop layout, vectors can be rebuilt from API on next full run */
  }

  try {
    const minimal: ProjectResultCache = {
      v: CACHE_VERSION,
      specification: payload.specification,
      designLock: payload.designLock,
      sheets: light.sheets,
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(minimal));
  } catch {
    /* ignore — in-memory state still valid for current session */
  }
}

export function clearResultCache(): void {
  sessionStorage.removeItem(CACHE_KEY);
}

export function vectorSheetsNeedHydration(sheets: ProjectSheetResult[]): boolean {
  return sheets.some(
    (sheet) =>
      isVectorSheet(sheet.id) &&
      !sheet.error &&
      (!sheet.image || sheet.image.length < 64)
  );
}

export async function hydrateVectorSheets(
  project: ProjectDetails,
  layout: BuildingLayout,
  specification: string,
  sheets: ProjectSheetResult[],
  labels: {
    projectTitle: string;
    sheetTitle: (key: SheetTitleKey) => string;
    errorLabel: string;
  }
): Promise<ProjectSheetResult[]> {
  const sheetDefs = getProjectSheets(project);
  const byId = new Map(sheets.map((s) => [s.id, { ...s }]));

  for (const def of sheetDefs) {
    if (!isVectorSheet(def.id)) continue;

    const existing = byId.get(def.id);
    if (existing?.image && existing.image.length >= 64) continue;
    if (existing?.error) continue;

    const floorLevel = getVectorFloorLevel(def.id);
    if (def.id === "site_plan_map" && !project.mapSnapshot) continue;
    if (
      floorLevel !== null &&
      !layoutHasFloor(layout, floorLevel)
    ) {
      continue;
    }

    try {
      const res = await fetch("/api/project/vector-sheet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project,
          specification,
          layout,
          sheetId: def.id,
          floorLevel: floorLevel ?? 1,
          sheetTitle: labels.sheetTitle(def.titleKey),
          projectTitle: labels.projectTitle,
          mapSnapshot: project.mapSnapshot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || labels.errorLabel);

      byId.set(def.id, {
        id: def.id,
        titleKey: def.titleKey,
        image: data.image,
        provider: "vector",
      });
    } catch (err) {
      byId.set(def.id, {
        id: def.id,
        titleKey: def.titleKey,
        image: "",
        provider: "vector",
        error:
          err instanceof Error ? err.message : labels.errorLabel,
      });
    }
  }

  return Array.from(byId.values());
}
