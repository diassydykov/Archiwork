import {
  floorTotalArea,
  roomArea,
  type BuildingLayout,
  type FloorLayout,
} from "@/lib/layout/schema";
import type { BuildingType } from "@/types";

function floorRoomsSummary(floor: FloorLayout): string {
  return floor.rooms
    .map((r) => `${r.name} ${roomArea(r)} m²`)
    .join(", ");
}

export function layoutToDesignLock(
  layout: BuildingLayout,
  buildingType: BuildingType
): string {
  const typeLabel =
    buildingType === "commercial" ? "Commercial building" : "Private house";

  const floors = layout.floors
    .map((f) => `L${f.level}: ${floorRoomsSummary(f)}`)
    .join(" | ");

  return [
    typeLabel,
    `footprint ${layout.building_width_m}×${layout.building_depth_m} m`,
    `${layout.floors.length} floor(s)`,
    floors,
    "same building in all drawings",
  ]
    .join(". ")
    .slice(0, 400);
}

export function layoutSummaryForPrompt(layout: BuildingLayout): string {
  const parts = [
    `Building footprint ${layout.building_width_m} m × ${layout.building_depth_m} m (rectangle).`,
    `Scale ${layout.scale}.`,
  ];

  for (const floor of layout.floors) {
    parts.push(
      `Floor ${floor.level} (${floorTotalArea(floor)} m²): ${floorRoomsSummary(floor)}.`
    );
    parts.push(
      `Floor ${floor.level} room positions from SW corner: ${floor.rooms
        .map(
          (r) =>
            `${r.name} at x=${r.x} y=${r.y} size ${r.width_m}×${r.depth_m} m`
        )
        .join("; ")}.`
    );
  }

  parts.push(
    "ORIENTATION: South facade = main front entrance (главный фасад). East = side elevation. North = rear facade with terrace. West = service side.",
    "CRITICAL: 3D render must show THIS exact building footprint, floor count, and proportions."
  );

  return parts.join(" ");
}

export function getVectorFloorLevel(sheetId: string): number | null {
  const match = sheetId.match(/^floor_(\d+)$/);
  if (!match) return null;
  return Number(match[1]);
}

export function layoutHasFloor(
  layout: BuildingLayout,
  level: number
): boolean {
  return layout.floors.some((f) => f.level === level);
}
