import { tileDrawPosition, tilesForViewport } from "@/lib/maps/tile-math";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed: ${src}`));
    img.src = src;
  });
}

async function loadTileWithRetry(
  z: number,
  x: number,
  y: number,
  attempts = 4
): Promise<HTMLImageElement> {
  let lastError: Error | undefined;
  for (let i = 0; i < attempts; i++) {
    try {
      return await loadImage(`/api/maps/tile?z=${z}&x=${x}&y=${y}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("tile");
      await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    }
  }
  throw lastError ?? new Error("tile");
}

/** Load tiles in small batches to avoid OSM rate limits */
async function forEachBatch<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}

export interface MapCaptureResult {
  dataUrl: string;
  zoom: number;
  width: number;
  height: number;
}

/**
 * Capture OSM map area around coordinates as PNG data URL (browser only).
 */
export async function captureMapSnapshot(
  latitude: number,
  longitude: number,
  options?: { width?: number; height?: number; zoom?: number }
): Promise<MapCaptureResult> {
  const width = options?.width ?? 800;
  const height = options?.height ?? 400;
  const zoom = options?.zoom ?? 19;

  const { tiles, left, top, canvasW, canvasH } = tilesForViewport(
    latitude,
    longitude,
    width,
    height,
    zoom
  );

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(0, 0, canvasW, canvasH);

  let failed = 0;
  await forEachBatch(tiles, 4, async (tile) => {
    try {
      const img = await loadTileWithRetry(tile.z, tile.x, tile.y);
      const { px, py } = tileDrawPosition(tile, left, top);
      ctx.drawImage(img, px, py);
    } catch {
      failed++;
    }
  });

  if (failed > tiles.length / 2) {
    throw new Error(`Too many tiles failed: ${failed}/${tiles.length}`);
  }

  const mx = width / 2;
  const my = height / 2;
  ctx.beginPath();
  ctx.fillStyle = "#2563eb";
  ctx.arc(mx, my - 6, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = "#2563eb";
  ctx.moveTo(mx, my + 14);
  ctx.lineTo(mx - 8, my);
  ctx.lineTo(mx + 8, my);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();

  return {
    dataUrl: canvas.toDataURL("image/png"),
    zoom,
    width,
    height,
  };
}
