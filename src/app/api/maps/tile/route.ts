import { NextResponse } from "next/server";

const USER_AGENT = "Archiwork/1.0 (archiwork; map-tile-proxy)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const z = searchParams.get("z");
  const x = searchParams.get("x");
  const y = searchParams.get("y");

  if (!z || !x || !y) {
    return NextResponse.json({ error: "z, x, y required" }, { status: 400 });
  }

  const zi = Number(z);
  const xi = Number(x);
  const yi = Number(y);
  if (!Number.isFinite(zi) || !Number.isFinite(xi) || !Number.isFinite(yi)) {
    return NextResponse.json({ error: "Invalid tile coords" }, { status: 400 });
  }

  const tileUrl = `https://tile.openstreetmap.org/${zi}/${xi}/${yi}.png`;

  try {
    const res = await fetch(tileUrl, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Tile fetch failed" },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Tile proxy error" }, { status: 502 });
  }
}
