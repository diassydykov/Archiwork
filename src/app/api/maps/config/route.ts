import { NextResponse } from "next/server";
import { getGoogleMapsApiKey } from "@/lib/maps/config";

export async function GET() {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json({ apiKey: null }, { status: 404 });
  }
  return NextResponse.json({ apiKey });
}
