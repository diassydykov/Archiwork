import type { RoomLayout } from "@/lib/layout/schema";

const EPS = 0.05;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Snap room edges to 5 cm grid to reduce float gaps */
function snapRoom(room: RoomLayout): RoomLayout {
  const x = round2(Math.round(room.x * 20) / 20);
  const y = round2(Math.round(room.y * 20) / 20);
  const x2 = round2(Math.round((room.x + room.width_m) * 20) / 20);
  const y2 = round2(Math.round((room.y + room.depth_m) * 20) / 20);
  return {
    ...room,
    x,
    y,
    width_m: Math.max(0.4, x2 - x),
    depth_m: Math.max(0.4, y2 - y),
  };
}

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 - EPS && b0 < a1 - EPS;
}

/**
 * Merge micro-gaps between adjacent rooms so walls share a single line.
 */
export function weldFloorRooms(
  rooms: RoomLayout[],
  buildingWidth: number,
  buildingDepth: number
): RoomLayout[] {
  const welded = rooms.map(snapRoom);

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < welded.length; i++) {
      for (let j = i + 1; j < welded.length; j++) {
        const a = welded[i];
        const b = welded[j];

        const aR = a.x + a.width_m;
        const aT = a.y + a.depth_m;
        const bR = b.x + b.width_m;
        const bT = b.y + b.depth_m;

        const vOverlap = rangesOverlap(a.y, aT, b.y, bT);
        const hOverlap = rangesOverlap(a.x, aR, b.x, bR);

        // A left of B — close horizontal gap
        if (vOverlap && b.x - aR > 0 && b.x - aR < 0.2) {
          b.x = aR;
          b.width_m = round2(bR - aR);
        }
        if (vOverlap && a.x - bR > 0 && a.x - bR < 0.2) {
          a.x = bR;
          a.width_m = round2(aR - bR);
        }

        // A below B — close vertical gap
        if (hOverlap && b.y - aT > 0 && b.y - aT < 0.2) {
          b.y = aT;
          b.depth_m = round2(bT - aT);
        }
        if (hOverlap && a.y - bT > 0 && a.y - bT < 0.2) {
          a.y = bT;
          a.depth_m = round2(aT - bT);
        }
      }
    }
  }

  // Clamp inside footprint
  return welded.map((r) => ({
    ...r,
    x: Math.max(0, Math.min(r.x, buildingWidth - 0.4)),
    y: Math.max(0, Math.min(r.y, buildingDepth - 0.4)),
    width_m: Math.min(r.width_m, buildingWidth - r.x),
    depth_m: Math.min(r.depth_m, buildingDepth - r.y),
  }));
}

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Collect interior + perimeter wall segments in pixel coords (plan view, y down). */
export function collectWallSegments(
  rooms: RoomLayout[],
  ox: number,
  oy: number,
  ppm: number,
  buildingDepthM: number
): WallSegment[] {
  const edgeCount = new Map<string, { x1: number; y1: number; x2: number; y2: number; n: number }>();

  function addEdge(x1: number, y1: number, x2: number, y2: number) {
    const key =
      x1 < x2 || (x1 === x2 && y1 < y2)
        ? `${x1}|${y1}|${x2}|${y2}`
        : `${x2}|${y2}|${x1}|${y1}`;
    const existing = edgeCount.get(key);
    if (existing) existing.n++;
    else edgeCount.set(key, { x1, y1, x2, y2, n: 1 });
  }

  for (const room of rooms) {
    const px = ox + room.x * ppm;
    const py = oy + (buildingDepthM - room.y - room.depth_m) * ppm;
    const pr = px + room.width_m * ppm;
    const pb = py + room.depth_m * ppm;

    addEdge(px, py, pr, py);
    addEdge(pr, py, pr, pb);
    addEdge(pr, pb, px, pb);
    addEdge(px, pb, px, py);
  }

  const walls: WallSegment[] = [];
  for (const { x1, y1, x2, y2, n } of edgeCount.values()) {
    if (n >= 1) walls.push({ x1, y1, x2, y2 });
  }
  return walls;
}
