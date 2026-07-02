import type { BuildingLayout } from "@/lib/layout/schema";
import { weldFloorRooms } from "@/lib/layout/snap-rooms";
import { svgToDataUrl } from "@/lib/layout/render-floor-plan";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface SiteFeature {
  id: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke?: string;
  round?: boolean;
}

export function renderSitePlanSvg(
  layout: BuildingLayout,
  options: { projectTitle: string; sheetTitle: string; floorCount: number }
): string {
  const plotW = layout.building_width_m * 2.8;
  const plotD = layout.building_depth_m * 2.4;
  const ppm = 14;
  const pad = 60;
  const legendW = 200;

  const pw = plotW * ppm;
  const pd = plotD * ppm;
  const width = pw + pad * 2 + legendW;
  const height = pd + pad * 2 + 180;

  const ox = pad;
  const oy = pad + 30;

  const bx = ox + plotW * ppm * 0.32;
  const by = oy + plotD * ppm * 0.28;
  const bw = layout.building_width_m * ppm;
  const bd = layout.building_depth_m * ppm;

  const floor1 = layout.floors.find((f) => f.level === 1);
  const rooms = floor1
    ? weldFloorRooms(
        floor1.rooms,
        layout.building_width_m,
        layout.building_depth_m
      )
    : [];

  let houseInterior = "";
  for (const room of rooms) {
    const rx = bx + room.x * ppm;
    const ry = by + (layout.building_depth_m - room.y - room.depth_m) * ppm;
    houseInterior += `<rect x="${rx}" y="${ry}" width="${room.width_m * ppm}" height="${room.depth_m * ppm}" fill="#fff" stroke="#333" stroke-width="0.5"/>`;
  }

  const features: SiteFeature[] = [
    {
      id: 1,
      name: `Жилой дом ${options.floorCount} эт.`,
      x: bx,
      y: by,
      w: bw,
      h: bd,
      fill: "#e8e4dc",
    },
    {
      id: 2,
      name: "Гараж",
      x: bx + bw + 30,
      y: by + bd - 55,
      w: 55,
      h: 45,
      fill: "#d1d5db",
    },
    {
      id: 3,
      name: "Беседка",
      x: ox + 20,
      y: oy + 15,
      w: 50,
      h: 50,
      fill: "#e5e7eb",
      round: true,
    },
    {
      id: 4,
      name: "Огород",
      x: ox + pw - 90,
      y: oy + 10,
      w: 75,
      h: 60,
      fill: "#d4edda",
    },
    {
      id: 5,
      name: "Хозблок",
      x: bx + bw + 8,
      y: by + 20,
      w: 35,
      h: 28,
      fill: "#e5e7eb",
    },
    {
      id: 6,
      name: "Водоём",
      x: ox + 25,
      y: oy + pd - 70,
      w: 45,
      h: 35,
      fill: "#bfdbfe",
      round: true,
    },
    {
      id: 7,
      name: "Накопитель",
      x: ox + pw - 45,
      y: oy + pd - 50,
      w: 25,
      h: 25,
      fill: "#93c5fd",
    },
    {
      id: 8,
      name: "Кострище",
      x: bx + bw / 2 - 20,
      y: oy + 12,
      w: 40,
      h: 40,
      fill: "#fde68a",
      round: true,
    },
    {
      id: 9,
      name: "Фруктовые кусты",
      x: ox + 100,
      y: by + bd / 2,
      w: 40,
      h: 50,
      fill: "#fbcfe8",
    },
  ];

  let featuresSvg = "";
  for (const f of features) {
    if (f.id === 1) continue;
    if (f.round) {
      featuresSvg += `<ellipse cx="${f.x + f.w / 2}" cy="${f.y + f.h / 2}" rx="${f.w / 2}" ry="${f.h / 2}" fill="${f.fill}" stroke="#666" stroke-width="1"/>`;
    } else {
      featuresSvg += `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="${f.fill}" stroke="#666" stroke-width="1"/>`;
    }
    featuresSvg += `<text x="${f.x + f.w / 2}" y="${f.y + f.h / 2 + 4}" text-anchor="middle" font-size="7" font-family="Arial, sans-serif" fill="#333">${f.id}</text>`;
  }

  const paths = `
    <path d="M ${ox + 45} ${oy + 40} Q ${bx - 20} ${oy + 60} ${bx + bw / 2} ${by + bd}" fill="none" stroke="#9ca3af" stroke-width="3" stroke-dasharray="6 4"/>
    <path d="M ${bx + bw} ${by + bd / 2} L ${bx + bw + 30} ${by + bd - 30}" fill="none" stroke="#9ca3af" stroke-width="3"/>
    <path d="M ${bx + bw / 2} ${by} L ${bx + bw / 2} ${oy + 32}" fill="none" stroke="#9ca3af" stroke-width="2"/>
  `;

  const lawn = `<rect x="${ox}" y="${oy}" width="${pw}" height="${pd}" fill="#dcfce7" stroke="#166534" stroke-width="2"/>`;

  const house = `
    <rect x="${bx}" y="${by}" width="${bw}" height="${bd}" fill="#e8e4dc" stroke="#111" stroke-width="2"/>
    ${houseInterior}
    <text x="${bx + bw / 2}" y="${by - 6}" text-anchor="middle" font-size="9" font-weight="bold" font-family="Arial, sans-serif">1</text>
  `;

  const explicationY = oy + pd + 20;
  let explication = `<text x="${ox}" y="${explicationY}" font-size="11" font-weight="bold" font-family="Arial, sans-serif">ЭКСПЛИКАЦИЯ</text>`;
  features.forEach((f, i) => {
    const ly = explicationY + 16 + i * 14;
    explication += `<text x="${ox}" y="${ly}" font-size="9" font-family="Arial, sans-serif">${f.id}. ${esc(f.name)}</text>`;
  });

  const legendX = ox + pw + 20;
  const legend = `
    <text x="${legendX}" y="${oy}" font-size="10" font-weight="bold" font-family="Arial, sans-serif">УСЛОВНЫЕ ОБОЗНАЧЕНИЯ</text>
    <rect x="${legendX}" y="${oy + 12}" width="14" height="14" fill="#dcfce7" stroke="#166534"/><text x="${legendX + 20}" y="${oy + 23}" font-size="8" font-family="Arial">Газон</text>
    <rect x="${legendX}" y="${oy + 32}" width="14" height="14" fill="#fbcfe8" stroke="#666"/><text x="${legendX + 20}" y="${oy + 43}" font-size="8" font-family="Arial">Кустарник</text>
    <rect x="${legendX}" y="${oy + 52}" width="14" height="14" fill="#d4edda" stroke="#666"/><text x="${legendX + 20}" y="${oy + 63}" font-size="8" font-family="Arial">Огород</text>
    <line x1="${legendX}" y1="${oy + 78}" x2="${legendX + 14}" y2="${oy + 78}" stroke="#9ca3af" stroke-width="3" stroke-dasharray="4 3"/><text x="${legendX + 20}" y="${oy + 81}" font-size="8" font-family="Arial">Дорожка</text>
    <circle cx="${legendX + 7}" cy="${oy + 96}" r="5" fill="#bbf7d0" stroke="#166534"/><text x="${legendX + 20}" y="${oy + 99}" font-size="8" font-family="Arial">Дерево</text>
  `;

  const trees = [
    [ox + 80, oy + pd - 40],
    [ox + pw - 80, oy + 50],
    [bx - 40, by + bd + 20],
    [bx + bw + 60, oy + 80],
  ]
    .map(
      ([tx, ty]) =>
        `<circle cx="${tx}" cy="${ty}" r="10" fill="#86efac" stroke="#166534" stroke-width="1"/><line x1="${tx}" y1="${ty}" x2="${tx}" y2="${ty + 8}" stroke="#854d0e" stroke-width="2"/>`
    )
    .join("");

  const north = `
    <polygon points="${width - 40},${oy + 10} ${width - 34},${oy + 22} ${width - 46},${oy + 22}" fill="#111"/>
    <text x="${width - 40}" y="${oy + 32}" text-anchor="middle" font-size="9" font-family="Arial">С</text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${width / 2}" y="28" text-anchor="middle" font-size="16" font-weight="bold" font-family="Arial, sans-serif" letter-spacing="4">Г Е Н П Л А Н</text>
  <text x="${pad}" y="48" font-size="11" font-family="Arial, sans-serif">${esc(options.projectTitle)} · Масштаб 1:500</text>
  ${lawn}
  ${trees}
  ${paths}
  ${featuresSvg}
  ${house}
  ${north}
  ${legend}
  ${explication}
  <text x="${pad}" y="${height - 8}" font-size="8" font-family="Arial" fill="#666">Archiwork — векторный генплан</text>
</svg>`;
}