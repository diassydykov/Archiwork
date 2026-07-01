import type { ProjectDetails } from "@/types";
import { LEONARDO_PROMPT_MAX_LENGTH, truncatePrompt } from "@/lib/ai/prompt-limit";

export type SheetId =
  | "site_plan"
  | "floor_1"
  | "floor_2"
  | "floor_3"
  | "front_elevation"
  | "side_elevation"
  | "rear_elevation"
  | "roof_plan"
  | "section"
  | "perspective";

export interface SheetDefinition {
  id: SheetId;
  titleKey: SheetTitleKey;
  aspectRatio: "16:9" | "1:1" | "4:5";
  blueprint: boolean;
}

export type SheetTitleKey =
  | "sheetSitePlan"
  | "sheetFloor1"
  | "sheetFloor2"
  | "sheetFloor3"
  | "sheetFrontElevation"
  | "sheetSideElevation"
  | "sheetRearElevation"
  | "sheetRoofPlan"
  | "sheetSection"
  | "sheetPerspective";

function parseFloorCount(floors: string): number {
  const n = parseInt(floors, 10);
  if (Number.isNaN(n) || n < 1) return 2;
  return Math.min(n, 3);
}

export function getProjectSheets(project: ProjectDetails): SheetDefinition[] {
  const floorCount = parseFloorCount(project.floors);
  const isResidential = project.buildingType === "residential";

  const sheets: SheetDefinition[] = [
    {
      id: "site_plan",
      titleKey: "sheetSitePlan",
      aspectRatio: "1:1",
      blueprint: true,
    },
  ];

  for (let i = 1; i <= floorCount; i++) {
    const id = `floor_${i}` as SheetId;
    const titleKey = `sheetFloor${i}` as SheetTitleKey;
    sheets.push({
      id,
      titleKey,
      aspectRatio: "1:1",
      blueprint: true,
    });
  }

  sheets.push(
    {
      id: "front_elevation",
      titleKey: "sheetFrontElevation",
      aspectRatio: "16:9",
      blueprint: true,
    },
    {
      id: "side_elevation",
      titleKey: "sheetSideElevation",
      aspectRatio: "16:9",
      blueprint: true,
    },
    {
      id: "rear_elevation",
      titleKey: "sheetRearElevation",
      aspectRatio: "16:9",
      blueprint: true,
    },
    {
      id: "roof_plan",
      titleKey: "sheetRoofPlan",
      aspectRatio: "1:1",
      blueprint: true,
    },
    {
      id: "section",
      titleKey: "sheetSection",
      aspectRatio: "4:5",
      blueprint: true,
    },
    {
      id: "perspective",
      titleKey: "sheetPerspective",
      aspectRatio: "16:9",
      blueprint: false,
    }
  );

  if (!isResidential && floorCount === 1) {
    return sheets.filter((s) => s.id !== "floor_2" && s.id !== "floor_3");
  }

  return sheets.filter((s) => {
    if (s.id === "floor_2" && floorCount < 2) return false;
    if (s.id === "floor_3" && floorCount < 3) return false;
    return true;
  });
}

function projectContext(project: ProjectDetails): string {
  const coords =
    project.latitude != null && project.longitude != null
      ? `GPS coordinates: ${project.latitude.toFixed(6)}, ${project.longitude.toFixed(6)}. Building placed at this site.`
      : "";

  return [
    project.description,
    project.area && `Total area: ${project.area} sqm`,
    project.floors && `Floors: ${project.floors}`,
    project.style && `Style: ${project.style}`,
    project.location && `Location: ${project.location}`,
    coords,
    project.wishes && `Requirements: ${project.wishes}`,
    project.additional,
  ]
    .filter(Boolean)
    .join(". ");
}

const sheetPrompts: Record<SheetId, string> = {
  site_plan:
    "Site plan / master plan of entire land plot, top view, showing building footprint, driveway, parking, pool, terrace, garden, trees, boundaries, north arrow, dimension lines in meters, scale 1:500, architectural blueprint",
  floor_1:
    "Architectural floor plan FIRST FLOOR only, top view, walls, doors, windows, room labels with names and areas in sqm, dimension chains in meters, staircase, furniture layout hints, scale 1:100, black lines on white, technical CAD drawing",
  floor_2:
    "Architectural floor plan SECOND FLOOR only, top view, bedrooms, bathrooms, balconies, dimension lines in meters, room labels, scale 1:100, black lines on white, technical CAD blueprint",
  floor_3:
    "Architectural floor plan THIRD FLOOR only, top view, dimension lines, room labels, scale 1:100, technical CAD blueprint",
  front_elevation:
    "Front elevation architectural drawing, facade view, height dimensions in meters, floor levels marked, window and door openings, materials notation, scale 1:100, technical blueprint black lines on white",
  side_elevation:
    "Side elevation architectural drawing, left side facade, height dimensions, floor levels, roof slope, scale 1:100, technical blueprint",
  rear_elevation:
    "Rear elevation architectural drawing, back facade view, terrace, windows, height dimensions in meters, scale 1:100, technical blueprint",
  roof_plan:
    "Roof plan top view, showing roof outline, slopes, drainage, chimneys, skylights, dimensions in meters, architectural blueprint",
  section:
    "Building cross-section A-A, cut through building showing floor heights, foundation, roof structure, room heights in meters, insulation layers, scale 1:100, technical architectural section drawing",
  perspective:
    "Photorealistic 3D architectural exterior visualization, professional render, golden hour lighting, landscaping, high detail",
};

export function buildSheetPrompt(
  project: ProjectDetails,
  sheet: SheetDefinition,
  specSummary?: string,
  maxLength = LEONARDO_PROMPT_MAX_LENGTH
): string {
  const base = sheetPrompts[sheet.id];
  const blueprintSuffix =
    " Include dimension lines, annotations, scale bar. Black ink on white background. No watercolor, no photorealistic rendering. CAD documentation style.";

  const header = sheet.blueprint
    ? `Professional architectural technical drawing. ${base}.`
    : `Professional architectural visualization. ${base}.`;
  const footer = sheet.blueprint ? blueprintSuffix : "";

  const overhead = header.length + footer.length + 32;
  const available = Math.max(0, maxLength - overhead);
  const ctxBudget = specSummary
    ? Math.min(500, Math.floor(available * 0.45))
    : available;
  const specBudget = specSummary ? available - ctxBudget : 0;

  const ctx = truncatePrompt(projectContext(project), ctxBudget);
  let prompt = `${header} Project: ${ctx}.`;

  if (specSummary && specBudget > 0) {
    prompt += ` Design brief: ${truncatePrompt(specSummary, specBudget)}.`;
  }

  prompt += footer;
  return truncatePrompt(prompt, maxLength);
}
