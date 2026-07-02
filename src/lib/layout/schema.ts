import { z } from "zod";

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number().nonnegative(),
  y: z.number().nonnegative(),
  width_m: z.number().positive(),
  depth_m: z.number().positive(),
});

export const FloorLayoutSchema = z.object({
  level: z.number().int().positive(),
  name: z.string(),
  rooms: z.array(RoomSchema).min(1),
});

export const BuildingLayoutSchema = z.object({
  building_width_m: z.number().positive(),
  building_depth_m: z.number().positive(),
  scale: z.string().default("1:100"),
  floors: z.array(FloorLayoutSchema).min(1),
});

export type RoomLayout = z.infer<typeof RoomSchema>;
export type FloorLayout = z.infer<typeof FloorLayoutSchema>;
export type BuildingLayout = z.infer<typeof BuildingLayoutSchema>;

export function roomArea(room: RoomLayout): number {
  return Math.round(room.width_m * room.depth_m * 10) / 10;
}

export function floorTotalArea(floor: FloorLayout): number {
  const sum = floor.rooms.reduce((acc, r) => acc + r.width_m * r.depth_m, 0);
  return Math.round(sum * 10) / 10;
}

export function normalizeLayout(layout: BuildingLayout): BuildingLayout {
  const building_width_m = layout.building_width_m;
  const building_depth_m = layout.building_depth_m;

  const floors = layout.floors.map((floor) => ({
    ...floor,
    rooms: floor.rooms.map((room) => {
      const width_m = Math.min(room.width_m, building_width_m);
      const depth_m = Math.min(room.depth_m, building_depth_m);
      const x = Math.max(0, Math.min(room.x, building_width_m - width_m));
      const y = Math.max(0, Math.min(room.y, building_depth_m - depth_m));
      return { ...room, x, y, width_m, depth_m };
    }),
  }));

  return { ...layout, building_width_m, building_depth_m, floors };
}
