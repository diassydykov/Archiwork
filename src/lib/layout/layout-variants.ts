import type { UnitRoom, FloorArchetype } from "@/lib/layout/layout-archetypes";
import {
  RESIDENTIAL_F1_BASE,
  RESIDENTIAL_F2_BASE,
  RESIDENTIAL_F3_BASE,
} from "@/lib/layout/layout-archetypes";

export interface LayoutTransform {
  id: string;
  mirrorX?: boolean;
  mirrorY?: boolean;
  swapIds?: [string, string];
  jitter?: number;
}

export const LAYOUT_TRANSFORMS: LayoutTransform[] = [
  { id: "base" },
  { id: "mx", mirrorX: true },
  { id: "my", mirrorY: true },
  { id: "mxy", mirrorX: true, mirrorY: true },
  { id: "mx_swap", mirrorX: true, swapIds: ["kitchen", "study"] },
  { id: "my_swap", mirrorY: true, swapIds: ["kitchen", "study"] },
  { id: "mx_swap2", mirrorX: true, swapIds: ["kitchen_living", "study"] },
  { id: "swap_dining", swapIds: ["kitchen", "dining"] },
  { id: "mx_swap_d", mirrorX: true, swapIds: ["kitchen", "dining"] },
];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function transformRoom(room: UnitRoom, t: LayoutTransform): UnitRoom {
  let { x, y, w, h } = room;

  if (t.mirrorX) {
    x = 1 - x - w;
  }
  if (t.mirrorY) {
    y = 1 - y - h;
  }

  if (t.jitter) {
    const j = t.jitter;
    const dx = (hashStr(room.id) % 100) / 10000 - j / 2;
    const dy = (hashStr(room.id + "y") % 100) / 10000 - j / 2;
    x = clamp01(x + dx);
    y = clamp01(y + dy);
    w = clamp01(w + dx * 0.5);
    h = clamp01(h + dy * 0.5);
  }

  return { ...room, x, y, w, h };
}

function swapRooms(rooms: UnitRoom[], a: string, b: string): UnitRoom[] {
  const roomA = rooms.find((r) => r.id === a);
  const roomB = rooms.find((r) => r.id === b);
  if (!roomA || !roomB) return rooms;

  return rooms.map((r) => {
    if (r.id === roomA.id) {
      return {
        ...r,
        x: roomB.x,
        y: roomB.y,
        w: roomB.w,
        h: roomB.h,
      };
    }
    if (r.id === roomB.id) {
      return {
        ...r,
        x: roomA.x,
        y: roomA.y,
        w: roomA.w,
        h: roomA.h,
      };
    }
    return r;
  });
}

export function applyTransform(
  archetype: FloorArchetype,
  transform: LayoutTransform
): FloorArchetype {
  let rooms = archetype.rooms.map((r) => transformRoom(r, transform));

  if (transform.swapIds) {
    const [a, b] = transform.swapIds;
    rooms = swapRooms(rooms, a, b);
  }

  const wetCore = archetype.wetCore
    ? transformRoom(
        {
          id: "wet",
          name: "wet",
          ...archetype.wetCore,
        },
        transform
      )
    : undefined;

  const stairs = archetype.stairs
    ? transformRoom(
        {
          id: "stairs",
          name: "stairs",
          ...archetype.stairs,
        },
        transform
      )
    : undefined;

  return {
    id: `${archetype.id}__${transform.id}`,
    label: `${archetype.label} (${transform.id})`,
    rooms,
    wetCore: wetCore
      ? { x: wetCore.x, y: wetCore.y, w: wetCore.w, h: wetCore.h }
      : undefined,
    stairs: stairs
      ? { x: stairs.x, y: stairs.y, w: stairs.w, h: stairs.h }
      : undefined,
  };
}

export interface FloorVariant {
  archetypeId: string;
  transformId: string;
  label: string;
  rooms: UnitRoom[];
}

function buildVariants(bases: FloorArchetype[]): FloorVariant[] {
  const out: FloorVariant[] = [];
  for (const base of bases) {
    for (const transform of LAYOUT_TRANSFORMS) {
      const applied = applyTransform(base, transform);
      out.push({
        archetypeId: base.id,
        transformId: transform.id,
        label: applied.label,
        rooms: applied.rooms,
      });
    }
  }
  return out;
}

export const F1_VARIANTS = buildVariants(RESIDENTIAL_F1_BASE);
export const F2_VARIANTS = buildVariants(RESIDENTIAL_F2_BASE);
export const F3_VARIANTS = buildVariants(RESIDENTIAL_F3_BASE);

export const TOTAL_LAYOUT_VARIANTS =
  F1_VARIANTS.length + F2_VARIANTS.length + F3_VARIANTS.length;

export function alignWetStack(
  f2Rooms: UnitRoom[],
  f1Wet?: { x: number; y: number; w: number; h: number }
): UnitRoom[] {
  if (!f1Wet) return f2Rooms;

  const wc = f2Rooms.find((r) => /санузел/i.test(r.name) && r.y < 0.15);
  const bath = f2Rooms.find(
    (r) => /ванн/i.test(r.name) && !/при/i.test(r.name) && r.y < 0.15
  );

  return f2Rooms.map((r) => {
    if (wc && r.id === wc.id) {
      return { ...r, x: f1Wet.x, w: f1Wet.w };
    }
    if (bath && r.id === bath.id) {
      return {
        ...r,
        x: Math.min(f1Wet.x + f1Wet.w + 0.01, 0.9),
        w: Math.max(r.w, f1Wet.w * 0.9),
      };
    }
    return r;
  });
}

export function alignStairs(
  f2Rooms: UnitRoom[],
  f1Stairs?: { x: number; y: number; w: number; h: number }
): UnitRoom[] {
  if (!f1Stairs) return f2Rooms;

  const stairs = f2Rooms.find((r) => /лестниц/i.test(r.name));
  if (!stairs) return f2Rooms;

  return f2Rooms.map((r) =>
    r.id === stairs.id ? { ...r, x: f1Stairs.x, w: f1Stairs.w } : r
  );
}
