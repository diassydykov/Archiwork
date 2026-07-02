import { NextResponse } from "next/server";
import { generateBuildingLayout } from "@/lib/layout/generate-layout";
import {
  isVectorSheet,
  renderVectorSheet,
  svgToDataUrl,
} from "@/lib/layout/render-sheet";
import type { SheetId } from "@/lib/ai/sheets";
import type { BuildingLayout } from "@/lib/layout/schema";
import type { ProjectDetails } from "@/types";

export const maxDuration = 45;

function parseFloorCount(floors: string): number {
  const n = parseInt(floors, 10);
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(n, 3);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = body.project as ProjectDetails;
    const specification = (body.specification as string) ?? "";
    const layoutInput = body.layout as BuildingLayout | undefined;
    const sheetId = (body.sheetId as SheetId) ?? "floor_1";
    const floorLevel = Number(body.floorLevel ?? 1);
    const sheetTitle = (body.sheetTitle as string) ?? "План 1-го этажа";
    const projectTitle = (body.projectTitle as string) ?? "Проект";
    const mapSnapshot = body.mapSnapshot as string | undefined;

    if (!project?.description) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!isVectorSheet(sheetId)) {
      return NextResponse.json(
        { error: `Sheet ${sheetId} is not a vector sheet` },
        { status: 400 }
      );
    }

    const layout =
      layoutInput ?? (await generateBuildingLayout(project, specification));

    const svg = renderVectorSheet(sheetId, layout, {
      projectTitle,
      sheetTitle,
      floorCount: parseFloorCount(project.floors),
      floorLevel,
      mapSnapshot: mapSnapshot ?? project.mapSnapshot,
      latitude: project.latitude,
      longitude: project.longitude,
      mapZoom: project.mapCaptureZoom,
      mapCaptureWidth: project.mapCaptureWidth,
      mapCaptureHeight: project.mapCaptureHeight,
    });
    const image = svgToDataUrl(svg);

    return NextResponse.json({
      layout,
      svg,
      image,
      provider: "vector",
      sheetId,
      floorLevel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vector sheet failed";
    console.error("Vector sheet error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
