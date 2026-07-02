import type { SheetId } from "@/lib/ai/sheets";
import type { BuildingLayout } from "@/lib/layout/schema";
import { renderElevationSvg } from "@/lib/layout/render-elevation";
import { renderRoofPlanSvg } from "@/lib/layout/render-roof-plan";
import { renderSectionSvg } from "@/lib/layout/render-section";
import { renderSiteMapOverlaySvg } from "@/lib/layout/render-site-map-overlay";
import { renderSitePlanSvg } from "@/lib/layout/render-site-plan";
import {
  renderFloorPlanSvg,
  svgToDataUrl,
} from "@/lib/layout/render-floor-plan";

export const VECTOR_SHEET_IDS: SheetId[] = [
  "site_plan",
  "site_plan_map",
  "floor_1",
  "floor_2",
  "floor_3",
  "front_elevation",
  "side_elevation",
  "rear_elevation",
  "roof_plan",
  "section",
];

export function isVectorSheet(sheetId: string): boolean {
  return VECTOR_SHEET_IDS.includes(sheetId as SheetId);
}

export function renderVectorSheet(
  sheetId: SheetId,
  layout: BuildingLayout,
  options: {
    projectTitle: string;
    sheetTitle: string;
    floorCount: number;
    floorLevel?: number;
    mapSnapshot?: string;
    latitude?: number;
    longitude?: number;
    mapZoom?: number;
    mapCaptureWidth?: number;
    mapCaptureHeight?: number;
  }
): string {
  switch (sheetId) {
    case "site_plan":
      return renderSitePlanSvg(layout, options);
    case "site_plan_map":
      if (!options.mapSnapshot) {
        throw new Error("Map snapshot required for site_plan_map");
      }
      if (options.latitude == null || options.longitude == null) {
        throw new Error("Coordinates required for site_plan_map");
      }
      return renderSiteMapOverlaySvg(layout, options.mapSnapshot, {
        projectTitle: options.projectTitle,
        sheetTitle: options.sheetTitle,
        floorCount: options.floorCount,
        latitude: options.latitude,
        longitude: options.longitude,
        mapZoom: options.mapZoom,
        mapCaptureWidth: options.mapCaptureWidth,
        mapCaptureHeight: options.mapCaptureHeight,
      });
    case "floor_1":
    case "floor_2":
    case "floor_3":
      return renderFloorPlanSvg(layout, {
        floorLevel: options.floorLevel ?? Number(sheetId.split("_")[1]),
        sheetTitle: options.sheetTitle,
        projectTitle: options.projectTitle,
      });
    case "front_elevation":
      return renderElevationSvg(layout, "front", options);
    case "side_elevation":
      return renderElevationSvg(layout, "side", options);
    case "rear_elevation":
      return renderElevationSvg(layout, "rear", options);
    case "roof_plan":
      return renderRoofPlanSvg(layout, options);
    case "section":
      return renderSectionSvg(layout, options);
    default:
      throw new Error(`No vector renderer for sheet: ${sheetId}`);
  }
}

export { svgToDataUrl };
