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
    "Site master plan top view of THE SAME building from design lock, building footprint on plot, driveway, parking, landscaping, north arrow, scale 1:500, unlabeled schematic blueprint",
  floor_1:
    "First floor plan top view of THE SAME building, walls doors windows staircase, unlabeled room rectangles, furniture outlines only, scale 1:100, pure black lines on white, NO text",
  floor_2:
    "Second floor plan top view of THE SAME building, bedrooms bathrooms balconies, unlabeled room rectangles, scale 1:100, pure black lines on white, NO text",
  floor_3:
    "Third floor plan top view of THE SAME building, unlabeled room rectangles, scale 1:100, pure black lines on white, NO text",
  front_elevation:
    "Front elevation of THE SAME building, main facade facing viewer, window and door openings, materials, scale 1:100, technical blueprint black lines on white, NO text",
  side_elevation:
    "Left side elevation of THE SAME building, height levels, roof profile, scale 1:100, technical blueprint, NO text",
  rear_elevation:
    "Rear elevation of THE SAME building, back facade terrace windows, scale 1:100, technical blueprint, NO text",
  roof_plan:
    "Roof plan top view of THE SAME building, roof outline slopes drainage, scale 1:100, schematic blueprint, NO text",
  section:
    "Building sectional drawing A-A of THE SAME building, interior floor levels foundation and roof structure, architectural section diagram, scale 1:100, NO text",
  perspective:
    "Photorealistic 3D exterior of THE SAME building, professional architectural render, golden hour, landscaping, consistent with design lock",
};

export function buildSheetPrompt(
  project: ProjectDetails,
  sheet: SheetDefinition,
  options?: {
    specSummary?: string;
    designLock?: string;
    maxLength?: number;
  }
): string {
  const specSummary = options?.specSummary;
  const designLock = options?.designLock;
  const maxLength = options?.maxLength ?? LEONARDO_PROMPT_MAX_LENGTH;

  const base = sheetPrompts[sheet.id];
  const blueprintSuffix =
    " Pure schematic line art. NO text, NO labels, NO letters, NO numbers, NO annotations, NO handwriting. Black ink on white background. CAD documentation style. Same building as all other sheets.";

  const lockPrefix = designLock
    ? `ONE PROJECT — design lock (must match exactly): ${truncatePrompt(designLock, 400)}. `
    : "";

  const header = sheet.blueprint
    ? `${lockPrefix}Professional architectural technical drawing. ${base}.`
    : `${lockPrefix}Professional architectural visualization. ${base}.`;
  const footer = sheet.blueprint ? blueprintSuffix : " Same building as design lock.";

  const overhead = header.length + footer.length + 32;
  const available = Math.max(0, maxLength - overhead);
  const ctxBudget = specSummary
    ? Math.min(300, Math.floor(available * 0.4))
    : available;
  const specBudget = specSummary ? available - ctxBudget : 0;

  const ctx = truncatePrompt(projectContext(project), ctxBudget);
  let prompt = `${header} Client brief: ${ctx}.`;

  if (specSummary && specBudget > 0) {
    prompt += ` Spec excerpt: ${truncatePrompt(specSummary, specBudget)}.`;
  }

  prompt += footer;
  return truncatePrompt(prompt, maxLength);
}
