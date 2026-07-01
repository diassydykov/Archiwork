export type MapProvider = "osm" | "google";

export function getMapProvider(): MapProvider {
  const provider = process.env.NEXT_PUBLIC_MAP_PROVIDER?.toLowerCase();
  return provider === "google" ? "google" : "osm";
}
