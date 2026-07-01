import { NextResponse } from "next/server";
import { getGoogleMapsApiKey } from "@/lib/maps/config";
import { buildOsmStaticMapUrl } from "@/lib/maps/osm";
import { getMapProvider } from "@/lib/maps/provider";
import { buildStaticMapUrl } from "@/lib/maps/static";

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

  const provider = getMapProvider();
  const googleKey = getGoogleMapsApiKey();

  let mapUrl: string | null = null;

  if (provider === "google" && googleKey) {
    mapUrl = buildStaticMapUrl(latitude, longitude, {
      width: w,
      height: h,
      zoom: z,
    });
  } else {
    mapUrl = buildOsmStaticMapUrl(latitude, longitude, w, h, z);
  }

  if (!mapUrl) {
    mapUrl = buildOsmStaticMapUrl(latitude, longitude, w, h, z);
  }

  const res = await fetch(mapUrl);
  if (!res.ok && provider === "google" && googleKey) {
    const osmUrl = buildOsmStaticMapUrl(latitude, longitude, w, h, z);
    const osmRes = await fetch(osmUrl);
    if (!osmRes.ok) {
      return NextResponse.json(
        { error: "Failed to load static map" },
        { status: osmRes.status }
      );
    }
    const image = await osmRes.arrayBuffer();
    return new NextResponse(image, {
      headers: {
        "Content-Type": osmRes.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

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
