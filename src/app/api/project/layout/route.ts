import { NextResponse } from "next/server";
import { generateBuildingLayout } from "@/lib/layout/generate-layout";
import type { ProjectDetails } from "@/types";

export const maxDuration = 45;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = body.project as ProjectDetails;
    const specification = (body.specification as string) ?? "";

    if (!project?.description) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const layout = await generateBuildingLayout(project, specification);
    return NextResponse.json({ layout });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Layout failed";
    console.error("Layout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
