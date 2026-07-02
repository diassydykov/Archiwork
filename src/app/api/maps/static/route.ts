import { NextResponse } from "next/server";
import { tileDrawPosition, tilesForViewport } from "@/lib/maps/tile-math";

const USER_AGENT = "Archiwork/1.0 (archiwork; map-tile-proxy)";

async function fetchTileBase64(
  z: number,
  x: number,
  y: number,
  attempts = 3
): Promise<string> {
  let lastError: Error | undefined;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(
        `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
        {
          headers: { "User-Agent": USER_AGENT },
          next: { revalidate: 86400 },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.toString("base64");
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("tile");
      await new Promise((r) => setTimeout(r, 100 * (i + 1)));
    }
  }
  throw lastError ?? new Error("tile");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const width = Number(searchParams.get("width") ?? "800");
  const height = Number(searchParams.get("height") ?? "400");
  const zoom = Number(searchParams.get("zoom") ?? "17");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const w = Math.min(Math.max(width, 100), 1280);
  const h = Math.min(Math.max(height, 100), 1280);
  const z = Math.min(Math.max(zoom, 1), 19);

  try {
    const { tiles, left, top, canvasW, canvasH } = tilesForViewport(
      latitude,
      longitude,
      w,
      h,
      z
    );

    let images = "";
    for (const tile of tiles) {
      try {
        const b64 = await fetchTileBase64(tile.z, tile.x, tile.y);
        const { px, py } = tileDrawPosition(tile, left, top);
        images += `<image href="data:image/png;base64,${b64}" x="${px}" y="${py}" width="256" height="256"/>`;
      } catch {
        const { px, py } = tileDrawPosition(tile, left, top);
        images += `<rect x="${px}" y="${py}" width="256" height="256" fill="#e5e7eb"/>`;
      }
    }

    const mx = w / 2;
    const my = h / 2;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}">
  <rect width="100%" height="100%" fill="#e5e7eb"/>
  ${images}
  <circle cx="${mx}" cy="${my - 6}" r="10" fill="#2563eb"/>
  <polygon points="${mx},${my + 14} ${mx - 8},${my} ${mx + 8},${my}" fill="#2563eb"/>
</svg>`;

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load static map" },
      { status: 502 }
    );
  }
}
