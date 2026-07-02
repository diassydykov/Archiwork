import { normalizeLayout, type BuildingLayout, type RoomLayout } from "@/lib/layout/schema";
import type { UnitRoom } from "@/lib/layout/layout-archetypes";
import {
  F1_VARIANTS,
  F2_VARIANTS,
  F3_VARIANTS,
  alignStairs,
  alignWetStack,
} from "@/lib/layout/layout-variants";
import { createRng, layoutGenerationSeed } from "@/lib/layout/layout-rng";
import type { ProjectDetails } from "@/types";

function parseFloorCount(floors: string): number {
  const n = parseInt(floors, 10);
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(n, 3);
}

function parseArea(project: ProjectDetails): number {
  return parseFloat(project.area.replace(",", ".")) || 200;
}

/** Footprint from user total area ÷ floor count */
function footprintFromArea(
  totalArea: number,
  floorCount: number,
  rng: ReturnType<typeof createRng>
): { width: number; depth: number } {
  const footprintArea = totalArea / Math.max(floorCount, 1);
  const ratio = rng.float(0.85, 1.2);
  const width = Math.round(Math.sqrt(footprintArea * ratio) * 10) / 10;
  const depth = Math.round((footprintArea / width) * 10) / 10;
  return { width, depth };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function unitToMeters(
  rooms: UnitRoom[],
  width: number,
  depth: number
): RoomLayout[] {
  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    x: round1(width * room.x),
    y: round1(depth * room.y),
    width_m: round1(width * room.w),
    depth_m: round1(depth * room.h),
  }));
}

function projectKey(project: ProjectDetails): string {
  return [
    project.buildingType,
    project.area,
    project.floors,
    project.description.slice(0, 80),
  ].join("|");
}

export function generateProceduralLayout(
  project: ProjectDetails,
  nonce?: string
): BuildingLayout {
  const seed = layoutGenerationSeed(projectKey(project), nonce);
  const rng = createRng(seed);
  const area = parseArea(project);
  const floorCount = parseFloorCount(project.floors);
  const { width, depth } = footprintFromArea(area, floorCount, rng);

  if (project.buildingType === "commercial") {
    return generateCommercialLayout(project, width, depth, floorCount, rng);
  }

  const f1 = rng.pick(F1_VARIANTS);
  const f1Base = f1;

  const floors = [
    {
      level: 1,
      name: "План 1-го этажа",
      rooms: unitToMeters(f1Base.rooms, width, depth),
    },
  ];

  let f1Wet: { x: number; y: number; w: number; h: number } | undefined;
  let f1Stairs: { x: number; y: number; w: number; h: number } | undefined;

  const f1WetRoom = f1Base.rooms.find((r) => /санузел/i.test(r.name));
  const f1StairsRoom = f1Base.rooms.find((r) => /лестниц/i.test(r.name));
  if (f1WetRoom) {
    f1Wet = { x: f1WetRoom.x, y: f1WetRoom.y, w: f1WetRoom.w, h: f1WetRoom.h };
  }
  if (f1StairsRoom) {
    f1Stairs = {
      x: f1StairsRoom.x,
      y: f1StairsRoom.y,
      w: f1StairsRoom.w,
      h: f1StairsRoom.h,
    };
  }

  if (floorCount >= 2) {
    const f2 = rng.pick(F2_VARIANTS);
    let f2Rooms = [...f2.rooms];
    f2Rooms = alignWetStack(f2Rooms, f1Wet);
    f2Rooms = alignStairs(f2Rooms, f1Stairs);

    floors.push({
      level: 2,
      name: "План 2-го этажа",
      rooms: unitToMeters(f2Rooms, width, depth),
    });
  }

  if (floorCount >= 3) {
    const f3 = rng.pick(F3_VARIANTS);
    floors.push({
      level: 3,
      name: "План 3-го этажа",
      rooms: unitToMeters(f3.rooms, width, depth),
    });
  }

  return normalizeLayout({
    building_width_m: width,
    building_depth_m: depth,
    scale: "1:100",
    floors,
  });
}

/** Commercial uses procedural picks from F1/F2 patterns simplified */
function generateCommercialLayout(
  project: ProjectDetails,
  width: number,
  depth: number,
  floorCount: number,
  rng: ReturnType<typeof createRng>
): BuildingLayout {
  void project;
  const shopLayouts = F1_VARIANTS.filter((v) =>
    v.rooms.some((r) => /торгов|зал|офис/i.test(r.name))
  );
  const pick =
    shopLayouts.length > 0 ? rng.pick(shopLayouts) : rng.pick(F1_VARIANTS);

  const floors = [
    {
      level: 1,
      name: "План 1-го этажа",
      rooms: unitToMeters(
        pick.rooms.map((r) => ({
          ...r,
          name: r.name
            .replace(/Гостиная/, "Торговый зал")
            .replace(/Кухня.*/, "Кафе")
            .replace(/Спальня/, "Офис")
            .replace(/Детская/, "Склад"),
        })),
        width,
        depth
      ),
    },
  ];

  if (floorCount >= 2) {
    const f2 = rng.pick(F2_VARIANTS);
    floors.push({
      level: 2,
      name: "План 2-го этажа",
      rooms: unitToMeters(
        f2.rooms.map((r) => ({
          ...r,
          name: r.name
            .replace(/Спальня/, "Офис")
            .replace(/Детская/, "Переговорная")
            .replace(/Гардероб/, "Архив"),
        })),
        width,
        depth
      ),
    });
  }

  return normalizeLayout({
    building_width_m: width,
    building_depth_m: depth,
    scale: "1:100",
    floors,
  });
}

export function getLayoutVariantStats(): {
  f1: number;
  f2: number;
  f3: number;
  total: number;
  combinations: number;
} {
  return {
    f1: F1_VARIANTS.length,
    f2: F2_VARIANTS.length,
    f3: F3_VARIANTS.length,
    total: F1_VARIANTS.length + F2_VARIANTS.length + F3_VARIANTS.length,
    combinations: F1_VARIANTS.length * F2_VARIANTS.length * F3_VARIANTS.length,
  };
}
