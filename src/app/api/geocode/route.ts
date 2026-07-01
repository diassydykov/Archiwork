import { NextResponse } from "next/server";
import { getGoogleMapsApiKey } from "@/lib/maps/config";
import { reverseGeocodeOsm } from "@/lib/maps/osm";
import { getMapProvider } from "@/lib/maps/provider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const key = getGoogleMapsApiKey();
  const useGoogle = getMapProvider() === "google" && !!key;

  if (useGoogle) {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${latitude},${longitude}`);
    url.searchParams.set("key", key!);
    url.searchParams.set("language", "ru");

    try {
      const res = await fetch(url);
      const data = await res.json();
      const address = data.results?.[0]?.formatted_address;
      if (address) {
        return NextResponse.json({ address, provider: "google" });
      }
    } catch {
      /* fallback to OSM */
    }
  }

  const address = await reverseGeocodeOsm(latitude, longitude);
  return NextResponse.json({
    address,
    provider: "osm",
  });
}
