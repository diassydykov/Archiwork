import type { BuildingLayout } from "@/lib/layout/schema";
import {
  fitImageInBox,
  mapScaleDenominator,
  metersPerPixel,
} from "@/lib/maps/tile-math";

const DEFAULT_MAP_ZOOM = 19;
const DEFAULT_MAP_WIDTH = 800;
const DEFAULT_MAP_HEIGHT = 400;

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Genplan on real map snapshot — building footprint at geographic scale,
 * centered on the picked coordinates (map snapshot center / pin).
 */
export function renderSiteMapOverlaySvg(
  layout: BuildingLayout,
  mapSnapshot: string,
  options: {
    projectTitle: string;
    sheetTitle: string;
    floorCount: number;
    latitude: number;
    longitude: number;
    mapZoom?: number;
    mapCaptureWidth?: number;
    mapCaptureHeight?: number;
  }
): string {
  const width = 900;
  const height = 520;
  const pad = 40;
  const headerH = 30;

  const imgW = width - pad * 2;
  const imgH = height - pad * 2 - headerH - 40;

  const snapW = options.mapCaptureWidth ?? DEFAULT_MAP_WIDTH;
  const snapH = options.mapCaptureHeight ?? DEFAULT_MAP_HEIGHT;
  const zoom = options.mapZoom ?? DEFAULT_MAP_ZOOM;

  const fit = fitImageInBox(snapW, snapH, imgW, imgH);
  const imgX = pad + fit.x;
  const imgY = pad + headerH + fit.y;

  const mpp = metersPerPixel(options.latitude, zoom);
  const pxPerM = fit.scale / mpp;

  const bw = layout.building_width_m * pxPerM;
  const bd = layout.building_depth_m * pxPerM;

  const pinX = snapW / 2;
  const pinY = snapH / 2;
  const bx = imgX + pinX * fit.scale - bw / 2;
  const by = imgY + pinY * fit.scale - bd / 2;

  const scaleDenom = mapScaleDenominator(options.latitude, zoom);
  const scaleLabel = `М 1:${scaleDenom}`;

  const minFootprint = 12;
  const showDetail = bw >= minFootprint && bd >= minFootprint;

  const footprint = showDetail
    ? `<rect x="${bx}" y="${by}" width="${bw}" height="${bd}" fill="rgba(232,228,220,0.82)" stroke="#c2410c" stroke-width="2"/>
       <line x1="${bx}" y1="${by + bd}" x2="${bx + bw}" y2="${by + bd}" stroke="#c2410c" stroke-width="1.5" stroke-dasharray="4 2"/>`
    : `<rect x="${bx}" y="${by}" width="${Math.max(bw, 8)}" height="${Math.max(bd, 8)}" fill="rgba(232,228,220,0.9)" stroke="#c2410c" stroke-width="2"/>`;

  const northX = imgX + fit.w - 28;
  const northY = imgY + 16;
  const north = `
    <polygon points="${northX},${northY} ${northX + 6},${northY + 14} ${northX - 6},${northY + 14}" fill="#111"/>
    <text x="${northX}" y="${northY + 26}" text-anchor="middle" font-size="9" font-family="Arial">С</text>
  `;

  const barMeters = pickScaleBarMeters(mpp, fit.scale, imgW * 0.2);
  const barPx = barMeters / mpp * fit.scale;
  const barX = imgX + 12;
  const barY = imgY + fit.h - 20;
  const scaleBar = `
    <line x1="${barX}" y1="${barY}" x2="${barX + barPx}" y2="${barY}" stroke="#111" stroke-width="2"/>
    <line x1="${barX}" y1="${barY - 4}" x2="${barX}" y2="${barY + 4}" stroke="#111" stroke-width="1.5"/>
    <line x1="${barX + barPx}" y1="${barY - 4}" x2="${barX + barPx}" y2="${barY + 4}" stroke="#111" stroke-width="1.5"/>
    <text x="${barX + barPx / 2}" y="${barY + 14}" text-anchor="middle" font-size="8" font-family="Arial">${barMeters} м</text>
  `;

  const labelY = by - 6 > imgY + 10 ? by - 6 : by + bd + 14;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${width / 2}" y="24" text-anchor="middle" font-size="14" font-weight="bold" font-family="Arial, sans-serif" letter-spacing="3">Г Е Н П Л А Н · К А Р Т А</text>
  <text x="${pad}" y="42" font-size="10" font-family="Arial, sans-serif">${esc(options.projectTitle)} · ${scaleLabel} · привязка к местности</text>
  <image href="${mapSnapshot}" x="${imgX}" y="${imgY}" width="${fit.w}" height="${fit.h}" preserveAspectRatio="xMidYMid meet"/>
  ${footprint}
  <text x="${bx + bw / 2}" y="${labelY}" text-anchor="middle" font-size="9" font-weight="bold" fill="#c2410c" font-family="Arial, sans-serif">Жилой дом ${options.floorCount} эт.</text>
  ${north}
  ${scaleBar}
  <text x="${pad}" y="${height - 24}" font-size="9" font-family="Arial, sans-serif">1 — жилой дом · Снимок OpenStreetMap</text>
  <text x="${pad}" y="${height - 10}" font-size="8" font-family="Arial, sans-serif" fill="#666">Archiwork — генплан на карте местности</text>
</svg>`;
}

function pickScaleBarMeters(
  mpp: number,
  displayScale: number,
  maxBarPx: number
): number {
  const candidates = [5, 10, 20, 50, 100, 200];
  for (const m of candidates) {
    const px = (m / mpp) * displayScale;
    if (px <= maxBarPx) return m;
  }
  return 200;
}
