import { NextResponse } from "next/server";
import { generateImageFromPrompt } from "@/lib/ai/generate-image";
import {
  enhanceArchitecturalPrompt,
  getImagePromptEnhancer,
} from "@/lib/ai/enhance-prompt";
import { mapImageProviderError } from "@/lib/ai/provider-errors";
import { isGrokConfigured } from "@/lib/xai/grok";
import { isGrokImagineConfigured } from "@/lib/xai/imagine";
import { isS3Configured, persistGeneratedImages } from "@/lib/alem/s3";
import type { ProjectDetails } from "@/types";

// Генерация может занимать до 60+ секунд (Leonardo polling)
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({
    leonardo: !!process.env.LEONARDO_API_KEY,
    stability: !!process.env.STABILITY_API_KEY,
    qwen: !!process.env.QWEN_API_KEY,
    grok: isGrokConfigured(),
    grokImagine: isGrokImagineConfigured(),
    imagePromptLlm: getImagePromptEnhancer(),
    s3: isS3Configured(),
  });
}

export async function POST(request: Request) {
  try {
    const project = (await request.json()) as ProjectDetails;

    if (!project?.description || !project?.buildingType) {
      return NextResponse.json(
        { error: "Missing required project fields" },
        { status: 400 }
      );
    }

    const hasLeonardo = !!process.env.LEONARDO_API_KEY;
    const hasStability = !!process.env.STABILITY_API_KEY;
    const hasGrokImagine = isGrokImagineConfigured();

    if (!hasLeonardo && !hasStability && !hasGrokImagine) {
      return NextResponse.json(
        {
          error:
            "No AI provider configured. Add LEONARDO_API_KEY and/or STABILITY_API_KEY to .env.local (local) or Vercel Environment Variables (production).",
        },
        { status: 500 }
      );
    }

    const prompt = await enhanceArchitecturalPrompt(project);

    const result = await generateImageFromPrompt(prompt, "16:9", {
      preferLeonardo: hasLeonardo,
    });

    let images = [result.image];
    if (isS3Configured()) {
      try {
        images = await persistGeneratedImages(images);
      } catch (s3Error) {
        console.error("S3 persist failed, using original URLs:", s3Error);
      }
    }

    const enhancer = getImagePromptEnhancer();

    return NextResponse.json({
      prompt: result.prompt,
      provider: result.provider,
      images,
      promptEnhanced: enhancer !== "none",
      promptEnhancedBy: enhancer !== "none" ? enhancer : undefined,
      fallbackFromLeonardo: result.fallbackFromLeonardo,
      fallbackProvider: result.fallbackProvider,
      storedInS3: images.some((img) => img.includes("alem.ai")),
    });
  } catch (error) {
    const mapped = mapImageProviderError(error);
    const message =
      mapped?.message ??
      (error instanceof Error ? error.message : "Generation failed");
    console.error("Generation error:", message);
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
