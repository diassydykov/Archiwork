import { NextResponse } from "next/server";
import { buildSheetPrompt } from "@/lib/ai/sheets";
import { enhanceImagePrompt } from "@/lib/ai/enhance-prompt";
import { generateImageFromPrompt } from "@/lib/ai/generate-image";
import { sheetUsesReferenceImage } from "@/lib/ai/sheet-order";
import { persistGeneratedImages } from "@/lib/alem/s3";
import { mapImageProviderError } from "@/lib/ai/provider-errors";
import type { BuildingLayout } from "@/lib/layout/schema";
import type { SheetDefinition } from "@/lib/ai/sheets";
import type { ProjectDetails } from "@/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = body.project as ProjectDetails;
    const sheet = body.sheet as SheetDefinition;
    const specSummary = body.specSummary as string | undefined;
    const designLock = body.designLock as string | undefined;
    const layoutSummary = body.layoutSummary as string | undefined;
    const referenceImageId = body.referenceImageId as string | undefined;

    if (!project?.description || !sheet?.id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const useReference =
      !!referenceImageId &&
      sheet.id !== "perspective" &&
      sheetUsesReferenceImage(sheet.id);

    const basePrompt = buildSheetPrompt(project, sheet, {
      specSummary,
      designLock,
      layoutSummary,
    });
    const { prompt, enhancer } = await enhanceImagePrompt(basePrompt, {
      mode: sheet.blueprint ? "blueprint" : "visualization",
    });

    const result = await generateImageFromPrompt(prompt, sheet.aspectRatio, {
      referenceImageId: useReference ? referenceImageId : undefined,
      blueprint: sheet.blueprint,
      preferLeonardo: true,
    });

    let image = result.image;
    const persisted = await persistGeneratedImages([image]);
    image = persisted[0] ?? image;

    return NextResponse.json({
      sheetId: sheet.id,
      image,
      provider: result.provider,
      referenceImageId: result.referenceImageId,
      fallbackFromLeonardo: result.fallbackFromLeonardo,
      fallbackProvider: result.fallbackProvider,
      promptEnhancedBy: enhancer !== "none" ? enhancer : undefined,
    });
  } catch (error) {
    const mapped = mapImageProviderError(error);
    const message = mapped?.message ?? (error instanceof Error ? error.message : "Sheet failed");
    console.error("Sheet generation error:", message);
    return NextResponse.json(
      { error: message, errorCode: mapped?.code },
      {
        status:
          mapped?.code === "LEONARDO_NO_TOKENS"
            ? 402
            : mapped?.code === "CONTENT_MODERATION"
              ? 422
              : 500,
      }
    );
  }
}
