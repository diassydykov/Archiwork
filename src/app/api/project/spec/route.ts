import { NextResponse } from "next/server";
import { generateProjectSpecification } from "@/lib/alem/spec";
import type { ProjectDetails } from "@/types";

export async function POST(request: Request) {
  try {
    const project = (await request.json()) as ProjectDetails;

    if (!project?.description || !project?.buildingType) {
      return NextResponse.json(
        { error: "Missing required project fields" },
        { status: 400 }
      );
    }

    const specification = await generateProjectSpecification(project);
    return NextResponse.json({ specification });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Spec failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
