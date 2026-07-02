import type { BuildingLayout } from "@/lib/layout/schema";
import { svgToDataUrl } from "@/lib/layout/render-floor-plan";

export type ElevationSide = "front" | "side" | "rear";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TITLES: Record<ElevationSide, string> = {
  front: "Фасад (главный) · южный · главный вход",
  side: "Фасад (боковой) · восточный",
  rear: "Фасад (задний) · северный · терраса",
};

export function renderElevationSvg(
  layout: BuildingLayout,
  side: ElevationSide,
  options: {
    projectTitle: string;
    sheetTitle: string;
    floorCount: number;
  }
): string {
  const floorH = 3.2;
  const roofH = 2.4;
  const floors = options.floorCount;
  const totalH = floors * floorH + roofH;

  const facadeW =
    side === "side" ? layout.building_depth_m : layout.building_width_m;

  const ppm = 20;
  const pad = 70;
  const bw = facadeW * ppm;
  const bh = totalH * ppm;
  const width = bw + pad * 2;
  const height = bh + pad * 2 + 80;

  const ox = pad;
  const oy = pad + 30;

  let floorsSvg = "";
  for (let f = 0; f < floors; f++) {
    const fy = oy + bh - (f + 1) * floorH * ppm;
    floorsSvg += `<line x1="${ox}" y1="${fy}" x2="${ox + bw}" y2="${fy}" stroke="#999" stroke-width="0.8" stroke-dasharray="4 3"/>`;

    const winCount = side === "side" ? 2 : 3;
    const winW = bw / (winCount * 2 + 1);
    for (let w = 0; w < winCount; w++) {
      const wx = ox + winW + w * winW * 2;
      floorsSvg += `<rect x="${wx}" y="${fy + 25}" width="${winW}" height="${floorH * ppm - 50}" fill="#fff" stroke="#111" stroke-width="1.5"/>`;
      floorsSvg += `<line x1="${wx + winW / 2}" y1="${fy + 25}" x2="${wx + winW / 2}" y2="${fy + floorH * ppm - 25}" stroke="#111" stroke-width="0.8"/>`;
    }
  }

  const doorW = Math.min(bw * 0.18, 50);
  const doorX = ox + bw / 2 - doorW / 2;
  const doorY = oy + bh - floorH * ppm;
  const door =
    side === "front"
      ? `<rect x="${doorX}" y="${doorY + 20}" width="${doorW}" height="${floorH * ppm - 20}" fill="#fff" stroke="#111" stroke-width="2"/><line x1="${doorX + doorW / 2}" y1="${doorY + 40}" x2="${doorX + doorW / 2}" y2="${doorY + floorH * ppm - 40}" stroke="#111" stroke-width="1"/>`
      : side === "rear"
        ? `<rect x="${ox + 20}" y="${doorY + 30}" width="${bw - 40}" height="${floorH * ppm - 40}" fill="none" stroke="#111" stroke-width="1.5" stroke-dasharray="6 3"/><text x="${ox + bw / 2}" y="${doorY + floorH * ppm / 2}" text-anchor="middle" font-size="8" font-family="Arial" fill="#666">терраса</text>`
        : "";

  const roofY = oy;
  const roof = `
    <polygon points="${ox - 8},${oy + roofH * ppm} ${ox + bw / 2},${oy} ${ox + bw + 8},${oy + roofH * ppm}" fill="#e5e7eb" stroke="#111" stroke-width="2"/>
  `;

  const outline = `
    <rect x="${ox}" y="${oy + roofH * ppm}" width="${bw}" height="${floors * floorH * ppm}" fill="#fafafa" stroke="#111" stroke-width="2.5"/>
  `;

  const dims = `
    <line x1="${ox}" y1="${oy + bh + 20}" x2="${ox + bw}" y2="${oy + bh + 20}" stroke="#111" stroke-width="0.8"/>
    <text x="${ox + bw / 2}" y="${oy + bh + 34}" text-anchor="middle" font-size="10" font-family="Arial">${facadeW} м</text>
    <line x1="${ox - 20}" y1="${oy + roofH * ppm}" x2="${ox - 20}" y2="${oy + bh}" stroke="#111" stroke-width="0.8"/>
    <text x="${ox - 28}" y="${oy + bh / 2 + roofH * ppm / 2}" text-anchor="middle" font-size="10" font-family="Arial" transform="rotate(-90 ${ox - 28} ${oy + bh / 2 + roofH * ppm / 2})">${(floors * floorH).toFixed(1)} м</text>
  `;

  const subtitle = TITLES[side];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${pad}" y="22" font-size="13" font-weight="bold" font-family="Arial, sans-serif">${esc(options.projectTitle)}</text>
  <text x="${pad}" y="38" font-size="11" font-family="Arial, sans-serif">${esc(options.sheetTitle)} · ${subtitle} · М 1:100</text>
  ${outline}
  ${floorsSvg}
  ${door}
  ${roof}
  ${dims}
  <text x="${pad}" y="${height - 12}" font-size="8" font-family="Arial" fill="#666">Archiwork — векторный фасад</text>
</svg>`;
}