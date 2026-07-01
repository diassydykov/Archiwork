export function buildOsmStaticMapUrl(
  latitude: number,
  longitude: number,
  width: number,
  height: number,
  zoom = 17
): string {
  const w = Math.min(Math.max(Math.round(width), 100), 1280);
  const h = Math.min(Math.max(Math.round(height), 100), 1280);
  const z = Math.min(Math.max(Math.round(zoom), 1), 19);

  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: String(z),
    size: `${w}x${h}`,
    markers: `${latitude},${longitude},red-pushpin`,
  });

  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
}

export async function reverseGeocodeOsm(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "json");
  url.searchParams.set("accept-language", "ru");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Archiwork/1.0 (https://archiwork.app)",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) return null;

  const data = await res.json();
  return (data.display_name as string | undefined) ?? null;
}
