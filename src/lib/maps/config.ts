export function getGoogleMapsApiKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    undefined
  );
}
