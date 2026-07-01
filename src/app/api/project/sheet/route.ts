import { NextResponse } from "next/server";
import { buildSheetPrompt } from "@/lib/ai/sheets";
import { generateImageFromPrompt } from "@/lib/ai/generate-image";
import { persistGeneratedImages } from "@/lib/alem/s3";
import type { SheetDefinition } from "@/lib/ai/sheets";
import type { ProjectDetails } from "@/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = body.project as ProjectDetails;
    const sheet = body.sheet as SheetDefinition;
    const specSummary = body.specSummary as string | undefined;

    if (!project?.description || !sheet?.id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const prompt = buildSheetPrompt(project, sheet, specSummary);
    const result = await generateImageFromPrompt(prompt, sheet.aspectRatio);

    let image = result.image;
    const persisted = await persistGeneratedImages([image]);
    image = persisted[0] ?? image;

    return NextResponse.json({
      sheetId: sheet.id,
      image,
      provider: result.provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sheet failed";
    console.error("Sheet generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
