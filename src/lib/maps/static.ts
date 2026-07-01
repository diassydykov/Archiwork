import { getGoogleMapsApiKey } from "@/lib/maps/config";

export function buildStaticMapUrl(
  latitude: number,
  longitude: number,
  options?: { width?: number; height?: number; zoom?: number }
): string | null {
  const key = getGoogleMapsApiKey();
  if (!key) return null;

  const w = options?.width ?? 640;
  const h = options?.height ?? 640;
  const zoom = options?.zoom ?? 18;

  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: String(zoom),
    size: `${w}x${h}`,
    maptype: "satellite",
    markers: `color:red|${latitude},${longitude}`,
    key,
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
