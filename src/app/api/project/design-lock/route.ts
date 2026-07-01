import { NextResponse } from "next/server";
import { generateDesignLock } from "@/lib/ai/design-lock";
import type { ProjectDetails } from "@/types";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = body.project as ProjectDetails;
    const specification = body.specification as string;

    if (!project?.description || !specification) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const designLock = await generateDesignLock(project, specification);
    return NextResponse.json({ designLock });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Design lock failed";
    console.error("Design lock error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
