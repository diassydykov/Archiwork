import type { SheetDefinition, SheetId } from "@/lib/ai/sheets";
import type { ProjectSheetResult } from "@/types";

/** Vector sheets first (fast), 3D perspective last (slow AI). */
export function getSheetGenerationOrder(
  sheets: SheetDefinition[]
): SheetDefinition[] {
  const perspective = sheets.find((s) => s.id === "perspective");
  const rest = sheets.filter((s) => s.id !== "perspective");
  return perspective ? [...rest, perspective] : sheets;
}

export function sheetUsesReferenceImage(sheetId: SheetId): boolean {
  return [
    "site_plan",
    "front_elevation",
    "side_elevation",
    "rear_elevation",
    "roof_plan",
    "perspective",
  ].includes(sheetId);
}

export function sortSheetsForDisplay(
  sheets: ProjectSheetResult[],
  orderedDefs: SheetDefinition[]
): ProjectSheetResult[] {
  const order = orderedDefs.map((s) => s.id);
  return [...sheets].sort(
    (a, b) => order.indexOf(a.id as SheetId) - order.indexOf(b.id as SheetId)
  );
}
