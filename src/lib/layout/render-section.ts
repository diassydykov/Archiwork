import type { BuildingLayout } from "@/lib/layout/schema";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderSectionSvg(
  layout: BuildingLayout,
  options: {
    projectTitle: string;
    sheetTitle: string;
    floorCount: number;
  }
): string {
  const W = layout.building_width_m;
  const floorH = 3.2;
  const floors = options.floorCount;
  const totalH = floors * floorH + 1.2;
  const ppm = 22;
  const pad = 70;

  const bw = W * ppm;
  const bh = totalH * ppm;
  const width = bw + pad * 2 + 60;
  const height = bh + pad * 2 + 80;

  const ox = pad;
  const oy = pad + 40;
  const groundY = oy + bh;

  let floorsSvg = "";
  for (let f = 0; f < floors; f++) {
    const fy = groundY - (f + 1) * floorH * ppm;
    floorsSvg += `<line x1="${ox}" y1="${fy}" x2="${ox + bw}" y2="${fy}" stroke="#111" stroke-width="1"/>`;
    floorsSvg += `<text x="${ox - 8}" y="${fy + 4}" text-anchor="end" font-size="8" font-family="Arial">+${(f * floorH).toFixed(1)}</text>`;
  }

  const foundation = `
    <rect x="${ox - 8}" y="${groundY}" width="${bw + 16}" height="18" fill="#d1d5db" stroke="#111" stroke-width="1"/>
    <line x1="${ox - 20}" y1="${groundY}" x2="${ox + bw + 20}" y2="${groundY}" stroke="#111" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="${ox + bw + 24}" y="${groundY + 4}" font-size="8" font-family="Arial">0.000</text>
  `;

  const roof = `
    <polygon points="${ox - 6},${oy + 12} ${ox + bw / 2},${oy} ${ox + bw + 6},${oy + 12}" fill="#e5e7eb" stroke="#111" stroke-width="1.5"/>
  `;

  const outline = `
    <rect x="${ox}" y="${oy + 12}" width="${bw}" height="${bh - 12}" fill="#fafafa" stroke="#111" stroke-width="2"/>
  `;

  const stairs = `
    <polyline points="${ox + bw * 0.15},${groundY} ${ox + bw * 0.15},${oy + 12} ${ox + bw * 0.22},${oy + 12}" fill="none" stroke="#666" stroke-width="1" stroke-dasharray="4 2"/>
    <text x="${ox + bw * 0.18}" y="${oy + bh / 2}" font-size="7" font-family="Arial" fill="#666" transform="rotate(-90 ${ox + bw * 0.18} ${oy + bh / 2})">лестница</text>
  `;

  const cut = `
    <line x1="${ox}" y1="${oy - 10}" x2="${ox}" y2="${groundY + 18}" stroke="#111" stroke-width="3"/>
    <text x="${ox - 4}" y="${oy - 14}" font-size="9" font-weight="bold" font-family="Arial">A</text>
    <text x="${ox + bw + 4}" y="${oy - 14}" font-size="9" font-weight="bold" font-family="Arial">A</text>
  `;

  const dims = `
    <line x1="${ox}" y1="${groundY + 35}" x2="${ox + bw}" y2="${groundY + 35}" stroke="#111" stroke-width="0.8"/>
    <text x="${ox + bw / 2}" y="${groundY + 48}" text-anchor="middle" font-size="9" font-family="Arial">${W} м</text>
    <line x1="${ox - 25}" y1="${oy + 12}" x2="${ox - 25}" y2="${groundY}" stroke="#111" stroke-width="0.8"/>
    <text x="${ox - 32}" y="${oy + bh / 2}" text-anchor="middle" font-size="9" font-family="Arial" transform="rotate(-90 ${ox - 32} ${oy + bh / 2})">${totalH.toFixed(1)} м</text>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${pad}" y="22" font-size="13" font-weight="bold" font-family="Arial, sans-serif">${esc(options.projectTitle)}</text>
  <text x="${pad}" y="38" font-size="11" font-family="Arial, sans-serif">${esc(options.sheetTitle)} · Разрез A-A · М 1:100</text>
  ${foundation}
  ${outline}
  ${floorsSvg}
  ${stairs}
  ${roof}
  ${cut}
  ${dims}
  <text x="${pad}" y="${height - 8}" font-size="8" font-family="Arial" fill="#666">Archiwork — векторный разрез</text>
</svg>`;
}
