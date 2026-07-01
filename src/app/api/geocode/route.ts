import { NextResponse } from "next/server";
import { getGoogleMapsApiKey } from "@/lib/maps/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  const key = getGoogleMapsApiKey();
  if (!key) {
    return NextResponse.json({ error: "Maps API not configured" }, { status: 500 });
  }

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", key);
  url.searchParams.set("language", "ru");

  const res = await fetch(url);
  const data = await res.json();

  const address = data.results?.[0]?.formatted_address ?? null;
  return NextResponse.json({ address });
}
