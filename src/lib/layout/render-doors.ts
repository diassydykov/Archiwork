import type { RoomLayout } from "@/lib/layout/schema";

export interface DoorPlacement {
  x: number;
  y: number;
  /** Door width in meters */
  width: number;
  /** 'h' = door in horizontal wall, 'v' = vertical wall */
  axis: "h" | "v";
  main?: boolean;
}

const EPS = 0.08;

function sharedVerticalEdge(
  a: RoomLayout,
  b: RoomLayout
): { x: number; y0: number; y1: number } | null {
  const aR = a.x + a.width_m;
  const bR = b.x + b.width_m;
  if (Math.abs(aR - b.x) < EPS) {
    const y0 = Math.max(a.y, b.y);
    const y1 = Math.min(a.y + a.depth_m, b.y + b.depth_m);
    if (y1 - y0 > 0.6) return { x: aR, y0, y1 };
  }
  if (Math.abs(bR - a.x) < EPS) {
    const y0 = Math.max(a.y, b.y);
    const y1 = Math.min(a.y + a.depth_m, b.y + b.depth_m);
    if (y1 - y0 > 0.6) return { x: bR, y0, y1 };
  }
  return null;
}

function sharedHorizontalEdge(
  a: RoomLayout,
  b: RoomLayout
): { y: number; x0: number; x1: number } | null {
  const aT = a.y + a.depth_m;
  const bT = b.y + b.depth_m;
  if (Math.abs(aT - b.y) < EPS) {
    const x0 = Math.max(a.x, b.x);
    const x1 = Math.min(a.x + a.width_m, b.x + b.width_m);
    if (x1 - x0 > 0.6) return { y: aT, x0, x1 };
  }
  if (Math.abs(bT - a.y) < EPS) {
    const x0 = Math.max(a.x, b.x);
    const x1 = Math.min(a.x + a.width_m, b.x + b.width_m);
    if (x1 - x0 > 0.6) return { y: bT, x0, x1 };
  }
  return null;
}

export function computeDoors(
  rooms: RoomLayout[],
  floorLevel: number
): DoorPlacement[] {
  const doors: DoorPlacement[] = [];
  const used = new Set<string>();

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      const key = [a.id, b.id].sort().join("|");
      if (used.has(key)) continue;

      const ve = sharedVerticalEdge(a, b);
      if (ve) {
        const doorW = Math.min(0.9, (ve.y1 - ve.y0) * 0.35);
        doors.push({
          x: ve.x,
          y: (ve.y0 + ve.y1) / 2,
          width: doorW,
          axis: "v",
        });
        used.add(key);
        continue;
      }

      const he = sharedHorizontalEdge(a, b);
      if (he) {
        const doorW = Math.min(0.9, (he.x1 - he.x0) * 0.35);
        doors.push({
          x: (he.x0 + he.x1) / 2,
          y: he.y,
          width: doorW,
          axis: "h",
        });
        used.add(key);
      }
    }
  }

  if (floorLevel === 1) {
    const entry = rooms.find((r) =>
      /прихож|тамбур|холл/i.test(r.name)
    );
    if (entry) {
      doors.push({
        x: entry.x + entry.width_m / 2,
        y: 0,
        width: 1.0,
        axis: "h",
        main: true,
      });
    }
  }

  return doors;
}

export function renderDoorsSvg(
  doors: DoorPlacement[],
  ox: number,
  oy: number,
  ppm: number,
  buildingDepthM: number
): string {
  let svg = "";
  for (const door of doors) {
    const px = ox + door.x * ppm;
    const py = oy + (buildingDepthM - door.y) * ppm;
    const dw = door.width * ppm;
    const stroke = door.main ? "#c2410c" : "#111";
    const sw = door.main ? 2.5 : 1.5;

    if (door.axis === "h") {
      const wallY = py;
      svg += `
        <line x1="${px - dw / 2}" y1="${wallY}" x2="${px + dw / 2}" y2="${wallY}" stroke="#fafafa" stroke-width="4"/>
        <path d="M ${px - dw / 2} ${wallY} A ${dw} ${dw} 0 0 1 ${px + dw / 2} ${wallY}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
        ${door.main ? `<text x="${px}" y="${wallY + 14}" text-anchor="middle" font-size="8" font-weight="bold" fill="${stroke}" font-family="Arial">ВХОД</text>` : ""}
      `;
    } else {
      const wallX = px;
      svg += `
        <line x1="${wallX}" y1="${py - dw / 2}" x2="${wallX}" y2="${py + dw / 2}" stroke="#fafafa" stroke-width="4"/>
        <path d="M ${wallX} ${py - dw / 2} A ${dw} ${dw} 0 0 0 ${wallX} ${py + dw / 2}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
      `;
    }
  }
  return svg;
}
