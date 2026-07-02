/** Web Mercator tile math for OSM */

export function latLngToWorldPx(
  lat: number,
  lng: number,
  zoom: number
): { x: number; y: number } {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export interface TileRequest {
  z: number;
  /** Tile index for fetch URL (0 … 2^z-1, wrapped) */
  x: number;
  y: number;
  /** World tile column for canvas placement (may be negative) */
  worldX: number;
}

export function tilesForViewport(
  lat: number,
  lng: number,
  width: number,
  height: number,
  zoom: number
): {
  tiles: TileRequest[];
  left: number;
  top: number;
  canvasW: number;
  canvasH: number;
} {
  const center = latLngToWorldPx(lat, lng, zoom);
  const left = center.x - width / 2;
  const top = center.y - height / 2;
  const right = center.x + width / 2;
  const bottom = center.y + height / 2;

  const x0 = Math.floor(left / 256);
  const y0 = Math.floor(top / 256);
  const x1 = Math.floor(right / 256);
  const y1 = Math.floor(bottom / 256);

  const tiles: TileRequest[] = [];
  const maxTile = Math.pow(2, zoom);

  for (let ty = y0; ty <= y1; ty++) {
    if (ty < 0 || ty >= maxTile) continue;
    for (let tx = x0; tx <= x1; tx++) {
      const wrappedX = ((tx % maxTile) + maxTile) % maxTile;
      tiles.push({ z: zoom, x: wrappedX, y: ty, worldX: tx });
    }
  }

  return {
    tiles,
    left,
    top,
    canvasW: Math.ceil(width),
    canvasH: Math.ceil(height),
  };
}

export function tileDrawPosition(
  tile: TileRequest,
  left: number,
  top: number
): { px: number; py: number } {
  return {
    px: tile.worldX * 256 - left,
    py: tile.y * 256 - top,
  };
}

export function latLngToCanvasPx(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  width: number,
  height: number,
  zoom: number
): { x: number; y: number } {
  const center = latLngToWorldPx(centerLat, centerLng, zoom);
  const point = latLngToWorldPx(lat, lng, zoom);
  const left = center.x - width / 2;
  const top = center.y - height / 2;
  return { x: point.x - left, y: point.y - top };
}

/** Ground resolution in meters per screen pixel (Web Mercator / OSM). */
export function metersPerPixel(lat: number, zoom: number): number {
  const earthCircumference = 40075016.686;
  return (
    (earthCircumference * Math.cos((lat * Math.PI) / 180)) /
    (256 * Math.pow(2, zoom))
  );
}

/** How an image is letterboxed inside a box with preserveAspectRatio="meet". */
export function fitImageInBox(
  imageW: number,
  imageH: number,
  boxW: number,
  boxH: number
): { x: number; y: number; w: number; h: number; scale: number } {
  const scale = Math.min(boxW / imageW, boxH / imageH);
  const w = imageW * scale;
  const h = imageH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h, scale };
}

/** Approximate map scale denominator (1:N) at given latitude, zoom and screen DPI. */
export function mapScaleDenominator(lat: number, zoom: number, dpi = 96): number {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  if (cosLat < 1e-6) return 1;
  return Math.round(591657527.591555 / (Math.pow(2, zoom) * cosLat));
}
