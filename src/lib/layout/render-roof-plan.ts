import type { BuildingLayout } from "@/lib/layout/schema";
import { svgToDataUrl } from "@/lib/layout/render-floor-plan";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderRoofPlanSvg(
  layout: BuildingLayout,
  options: { projectTitle: string; sheetTitle: string }
): string {
  const W = layout.building_width_m;
  const D = layout.building_depth_m;
  const ppm = 18;
  const pad = 80;
  const stampH = 100;

  const bw = W * ppm;
  const bd = D * ppm;
  const width = bw + pad * 2 + 40;
  const height = bd + pad * 2 + stampH + 60;

  const ox = pad + 20;
  const oy = pad + 40;

  const cx = ox + bw / 2;
  const cy = oy + bd / 2;

  const ridgeNS = `
    <line x1="${cx}" y1="${oy}" x2="${cx}" y2="${oy + bd}" stroke="#111" stroke-width="1.5" stroke-dasharray="8 4"/>
  `;
  const ridgeEW = `
    <line x1="${ox}" y1="${cy}" x2="${ox + bw}" y2="${cy}" stroke="#111" stroke-width="1.5" stroke-dasharray="8 4"/>
  `;

  const planes = `
    <polygon points="${ox},${oy} ${cx},${oy} ${cx},${cy} ${ox},${cy}" fill="#e5e7eb" stroke="none"/>
    <polygon points="${cx},${oy} ${ox + bw},${oy} ${ox + bw},${cy} ${cx},${cy}" fill="#f3f4f6" stroke="none"/>
    <polygon points="${ox},${cy} ${cx},${cy} ${cx},${oy + bd} ${ox},${oy + bd}" fill="#f3f4f6" stroke="none"/>
    <polygon points="${cx},${cy} ${ox + bw},${cy} ${ox + bw},${oy + bd} ${cx},${oy + bd}" fill="#e5e7eb" stroke="none"/>
  `;

  const outline = `
    <rect x="${ox}" y="${oy}" width="${bw}" height="${bd}" fill="none" stroke="#111" stroke-width="2.5"/>
  `;

  const slopeArrows = `
    <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#111"/></marker></defs>
    <line x1="${ox + bw * 0.25}" y1="${oy + 20}" x2="${ox + bw * 0.25}" y2="${oy + 5}" stroke="#111" stroke-width="1" marker-end="url(#arr)"/>
    <text x="${ox + bw * 0.25 + 8}" y="${oy + 14}" font-size="8" font-family="Arial">i=0.35</text>
    <line x1="${ox + bw * 0.75}" y1="${oy + 20}" x2="${ox + bw * 0.75}" y2="${oy + 5}" stroke="#111" stroke-width="1" marker-end="url(#arr)"/>
    <text x="${ox + bw * 0.75 + 8}" y="${oy + 14}" font-size="8" font-family="Arial">i=0.35</text>
    <line x1="${ox + 12}" y1="${oy + bd * 0.3}" x2="${ox + 2}" y2="${oy + bd * 0.3}" stroke="#111" stroke-width="1" marker-end="url(#arr)"/>
    <text x="${ox + 14}" y="${oy + bd * 0.3 + 4}" font-size="8" font-family="Arial">i=0.35</text>
  `;

  const axisLetters = ["А", "Б", "В", "Г"];
  const axisNums = ["1", "2", "3", "4"];
  const axisSvg = axisLetters
    .map((l, i) => {
      const ay = oy + (bd / (axisLetters.length - 1)) * i;
      return `<circle cx="${ox - 22}" cy="${ay}" r="10" fill="#fff" stroke="#111"/><text x="${ox - 22}" y="${ay + 4}" text-anchor="middle" font-size="9" font-family="Arial">${l}</text>`;
    })
    .join("");
  const axisNumSvg = axisNums
    .map((n, i) => {
      const ax = ox + (bw / (axisNums.length - 1)) * i;
      return `<circle cx="${ax}" cy="${oy + bd + 22}" r="10" fill="#fff" stroke="#111"/><text x="${ax}" y="${oy + bd + 26}" text-anchor="middle" font-size="9" font-family="Arial">${n}</text>`;
    })
    .join("");

  const wMm = Math.round(W * 1000);
  const dMm = Math.round(D * 1000);
  const dims = `
    <line x1="${ox}" y1="${oy + bd + 45}" x2="${ox + bw}" y2="${oy + bd + 45}" stroke="#111" stroke-width="0.8"/>
    <text x="${ox + bw / 2}" y="${oy + bd + 58}" text-anchor="middle" font-size="9" font-family="Arial">${wMm}</text>
    <line x1="${ox - 35}" y1="${oy}" x2="${ox - 35}" y2="${oy + bd}" stroke="#111" stroke-width="0.8"/>
    <text x="${ox - 42}" y="${oy + bd / 2}" text-anchor="middle" font-size="9" font-family="Arial" transform="rotate(-90 ${ox - 42} ${oy + bd / 2})">${dMm}</text>
  `;

  const vent = `<rect x="${cx - 15}" y="${cy - 10}" width="30" height="20" fill="#fff" stroke="#111" stroke-width="1"/>`;

  const stampX = width - pad - 180;
  const stampY = height - stampH - 10;
  const stamp = `
    <rect x="${stampX}" y="${stampY}" width="180" height="${stampH}" fill="#fff" stroke="#111" stroke-width="1"/>
    <text x="${stampX + 8}" y="${stampY + 14}" font-size="8" font-family="Arial">${esc(options.projectTitle)}</text>
    <text x="${stampX + 8}" y="${stampY + 28}" font-size="8" font-weight="bold" font-family="Arial">План кровли М 1:100</text>
    <text x="${stampX + 8}" y="${stampY + 42}" font-size="7" font-family="Arial">Лист 8 · ЭП</text>
    <line x1="${stampX}" y1="${stampY + 50}" x2="${stampX + 180}" y2="${stampY + 50}" stroke="#111" stroke-width="0.5"/>
    <text x="${stampX + 8}" y="${stampY + 64}" font-size="7" font-family="Arial">ГАП: _________</text>
    <text x="${stampX + 8}" y="${stampY + 78}" font-size="7" font-family="Arial">Заказчик: _________</text>
  `;

  const note = `<text x="${ox}" y="${height - stampH - 20}" font-size="8" font-family="Arial">1. Все размеры на плане кровли даны с учётом уклона</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${width / 2}" y="28" text-anchor="middle" font-size="13" font-weight="bold" font-family="Arial, sans-serif">ПЛАН КРОВЛИ М 1:100</text>
  ${planes}
  ${ridgeNS}
  ${ridgeEW}
  ${outline}
  ${vent}
  ${slopeArrows}
  ${axisSvg}
  ${axisNumSvg}
  ${dims}
  ${note}
  ${stamp}
  <text x="${pad}" y="${height - 4}" font-size="8" font-family="Arial" fill="#666">Archiwork — векторный план кровли</text>
</svg>`;
}