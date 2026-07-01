import { NextResponse } from "next/server";
import { getGoogleMapsApiKey } from "@/lib/maps/config";
import { buildStaticMapUrl } from "@/lib/maps/static";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const width = Number(searchParams.get("width") ?? "800");
  const height = Number(searchParams.get("height") ?? "400");
  const zoom = Number(searchParams.get("zoom") ?? "18");

  if (!getGoogleMapsApiKey()) {
    return NextResponse.json({ error: "Maps API not configured" }, { status: 500 });
  }

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const mapUrl = buildStaticMapUrl(latitude, longitude, {
    width: Math.min(Math.max(width, 100), 1280),
    height: Math.min(Math.max(height, 100), 1280),
    zoom: Math.min(Math.max(zoom, 1), 21),
  });

  if (!mapUrl) {
    return NextResponse.json({ error: "Maps API not configured" }, { status: 500 });
  }

  const res = await fetch(mapUrl);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to load static map" },
      { status: res.status }
    );
  }

  const image = await res.arrayBuffer();
  return new NextResponse(image, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
