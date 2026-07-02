import {
  floorTotalArea,
  roomArea,
  type BuildingLayout,
  type FloorLayout,
} from "@/lib/layout/schema";
import { collectWallSegments, weldFloorRooms } from "@/lib/layout/snap-rooms";
import { computeDoors, renderDoorsSvg } from "@/lib/layout/render-doors";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dimLineH(
  x: number,
  y: number,
  length: number,
  label: string
): string {
  const tick = 6;
  return `
    <line x1="${x}" y1="${y}" x2="${x + length}" y2="${y}" stroke="#111" stroke-width="1"/>
    <line x1="${x}" y1="${y - tick}" x2="${x}" y2="${y + tick}" stroke="#111" stroke-width="1"/>
    <line x1="${x + length}" y1="${y - tick}" x2="${x + length}" y2="${y + tick}" stroke="#111" stroke-width="1"/>
    <text x="${x + length / 2}" y="${y - 8}" text-anchor="middle" font-size="11" fill="#111" font-family="Arial, sans-serif">${esc(label)}</text>
  `;
}

function dimLineV(
  x: number,
  y: number,
  length: number,
  label: string
): string {
  const tick = 6;
  return `
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y + length}" stroke="#111" stroke-width="1"/>
    <line x1="${x - tick}" y1="${y}" x2="${x + tick}" y2="${y}" stroke="#111" stroke-width="1"/>
    <line x1="${x - tick}" y1="${y + length}" x2="${x + tick}" y2="${y + length}" stroke="#111" stroke-width="1"/>
    <text x="${x - 10}" y="${y + length / 2}" text-anchor="middle" font-size="11" fill="#111" font-family="Arial, sans-serif" transform="rotate(-90 ${x - 10} ${y + length / 2})">${esc(label)}</text>
  `;
}

function renderAreaSchedule(floor: FloorLayout, x: number, y: number): string {
  const rowH = 18;
  const colW = [28, 200, 80];
  let rows = `
    <rect x="${x}" y="${y}" width="${colW[0] + colW[1] + colW[2]}" height="${rowH}" fill="#f3f4f6" stroke="#111"/>
    <text x="${x + colW[0] / 2}" y="${y + 13}" text-anchor="middle" font-size="10" font-weight="bold" font-family="Arial, sans-serif">№</text>
    <text x="${x + colW[0] + colW[1] / 2}" y="${y + 13}" text-anchor="middle" font-size="10" font-weight="bold" font-family="Arial, sans-serif">Помещение</text>
    <text x="${x + colW[0] + colW[1] + colW[2] / 2}" y="${y + 13}" text-anchor="middle" font-size="10" font-weight="bold" font-family="Arial, sans-serif">м²</text>
  `;

  floor.rooms.forEach((room, i) => {
    const ry = y + rowH * (i + 1);
    rows += `
      <rect x="${x}" y="${ry}" width="${colW[0]}" height="${rowH}" fill="#fff" stroke="#111"/>
      <rect x="${x + colW[0]}" y="${ry}" width="${colW[1]}" height="${rowH}" fill="#fff" stroke="#111"/>
      <rect x="${x + colW[0] + colW[1]}" y="${ry}" width="${colW[2]}" height="${rowH}" fill="#fff" stroke="#111"/>
      <text x="${x + colW[0] / 2}" y="${ry + 13}" text-anchor="middle" font-size="10" font-family="Arial, sans-serif">${i + 1}</text>
      <text x="${x + colW[0] + 8}" y="${ry + 13}" font-size="10" font-family="Arial, sans-serif">${esc(room.name)}</text>
      <text x="${x + colW[0] + colW[1] + colW[2] / 2}" y="${ry + 13}" text-anchor="middle" font-size="10" font-family="Arial, sans-serif">${roomArea(room)}</text>
    `;
  });

  const totalY = y + rowH * (floor.rooms.length + 1);
  rows += `
    <rect x="${x}" y="${totalY}" width="${colW[0] + colW[1]}" height="${rowH}" fill="#f3f4f6" stroke="#111"/>
    <rect x="${x + colW[0] + colW[1]}" y="${totalY}" width="${colW[2]}" height="${rowH}" fill="#f3f4f6" stroke="#111"/>
    <text x="${x + colW[0] + colW[1] / 2}" y="${totalY + 13}" text-anchor="middle" font-size="10" font-weight="bold" font-family="Arial, sans-serif">Итого</text>
    <text x="${x + colW[0] + colW[1] + colW[2] / 2}" y="${totalY + 13}" text-anchor="middle" font-size="10" font-weight="bold" font-family="Arial, sans-serif">${floorTotalArea(floor)}</text>
  `;

  return rows;
}

export function renderFloorPlanSvg(
  layout: BuildingLayout,
  options: {
    floorLevel?: number;
    sheetTitle: string;
    projectTitle: string;
  }
): string {
  const floorLevel = options.floorLevel ?? 1;
  const floorRaw = layout.floors.find((f) => f.level === floorLevel);
  if (!floorRaw) {
    throw new Error(`Floor ${floorLevel} not found in layout`);
  }

  const rooms = weldFloorRooms(
    floorRaw.rooms,
    layout.building_width_m,
    layout.building_depth_m
  );
  const floor: FloorLayout = { ...floorRaw, rooms };

  const ppm = 22;
  const pad = 90;
  const scheduleW = 308;
  const bw = layout.building_width_m * ppm;
  const bd = layout.building_depth_m * ppm;
  const scheduleH = 18 * (floor.rooms.length + 3);
  const width = Math.max(bw + pad * 2, scheduleW + pad * 2);
  const planHeight = bd + pad * 2 + 40;
  const height = planHeight + scheduleH + 80;

  const ox = pad;
  const oy = 50;

  let fillsSvg = "";
  for (const room of floor.rooms) {
    const rx = Math.round(ox + room.x * ppm);
    const ry = Math.round(oy + (layout.building_depth_m - room.y - room.depth_m) * ppm);
    const rw = Math.round(room.width_m * ppm);
    const rh = Math.round(room.depth_m * ppm);
    const area = roomArea(room);
    const compact = room.width_m < 2.2 || room.depth_m < 2.5;
    const nameSize = compact ? 8 : 11;

    fillsSvg += `
      <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="#fafafa" stroke="none"/>
      <text x="${rx + rw / 2}" y="${ry + rh / 2 - (compact ? 2 : 6)}" text-anchor="middle" font-size="${nameSize}" font-weight="bold" font-family="Arial, sans-serif" fill="#111">${esc(room.name)}</text>
      ${compact ? "" : `<text x="${rx + rw / 2}" y="${ry + rh / 2 + 10}" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" fill="#444">${area} м²</text>`}
    `;
  }

  const walls = collectWallSegments(
    floor.rooms,
    ox,
    oy,
    ppm,
    layout.building_depth_m
  );
  const wallsSvg = walls
    .map(
      (w) =>
        `<line x1="${Math.round(w.x1)}" y1="${Math.round(w.y1)}" x2="${Math.round(w.x2)}" y2="${Math.round(w.y2)}" stroke="#111" stroke-width="2"/>`
    )
    .join("");

  const doors = computeDoors(floor.rooms, floorLevel);
  const doorsSvg = renderDoorsSvg(
    doors,
    ox,
    oy,
    ppm,
    layout.building_depth_m
  );

  const outline = `
    <rect x="${ox}" y="${oy}" width="${bw}" height="${bd}" fill="none" stroke="#111" stroke-width="2.5"/>
  `;

  const dims = `
    ${dimLineH(ox, oy + bd + 28, bw, `${layout.building_width_m} м`)}
    ${dimLineV(ox - 28, oy, bd, `${layout.building_depth_m} м`)}
  `;

  const north = `
    <polygon points="${width - 50},${oy + 10} ${width - 42},${oy + 26} ${width - 58},${oy + 26}" fill="#111"/>
    <text x="${width - 50}" y="${oy + 38}" text-anchor="middle" font-size="10" font-family="Arial, sans-serif">С</text>
  `;

  const schedule = renderAreaSchedule(floor, pad, planHeight + 10);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${pad}" y="24" font-size="14" font-weight="bold" font-family="Arial, sans-serif" fill="#111">${esc(options.projectTitle)}</text>
  <text x="${pad}" y="40" font-size="12" font-family="Arial, sans-serif" fill="#333">${esc(options.sheetTitle)} · Масштаб ${esc(layout.scale)}</text>
  ${fillsSvg}
  ${wallsSvg}
  ${doorsSvg}
  ${outline}
  ${dims}
  ${north}
  <text x="${pad}" y="${planHeight}" font-size="11" font-weight="bold" font-family="Arial, sans-serif">Экспликация помещений</text>
  ${schedule}
  <text x="${pad}" y="${height - 12}" font-size="9" font-family="Arial, sans-serif" fill="#666">Archiwork — векторный чертёж (SVG)</text>
</svg>`;
}

export function svgToDataUrl(svg: string): string {
  const encoded = Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}
