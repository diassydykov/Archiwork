import { NextResponse } from "next/server";
import {
  enhanceArchitecturalPrompt,
  getImagePromptEnhancer,
} from "@/lib/ai/enhance-prompt";
import { isGrokConfigured } from "@/lib/xai/grok";
import { isS3Configured, persistGeneratedImages } from "@/lib/alem/s3";
import { generateWithLeonardo } from "@/lib/leonardo/client";
import { generateWithStability } from "@/lib/stability/client";
import type { ProjectDetails } from "@/types";

// Генерация может занимать до 60+ секунд (Leonardo polling)
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({
    leonardo: !!process.env.LEONARDO_API_KEY,
    stability: !!process.env.STABILITY_API_KEY,
    qwen: !!process.env.QWEN_API_KEY,
    grok: isGrokConfigured(),
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

    if (!hasLeonardo && !hasStability) {
      return NextResponse.json(
        {
          error:
            "No AI provider configured. Add LEONARDO_API_KEY and/or STABILITY_API_KEY to .env.local (local) or Vercel Environment Variables (production).",
        },
        { status: 500 }
      );
    }

    const prompt = await enhanceArchitecturalPrompt(project);

    let result: { prompt: string; provider: string; images: string[] };
    const errors: string[] = [];

    // Stability быстрее — пробуем первым (важно для лимита Vercel ~10–60 сек)
    if (hasStability) {
      try {
        result = await generateWithStability(project, prompt);
      } catch (stabilityError) {
        const msg =
          stabilityError instanceof Error
            ? stabilityError.message
            : "Stability failed";
        errors.push(msg);
        console.error("Stability failed:", stabilityError);

        if (!hasLeonardo) throw stabilityError;
        result = await generateWithLeonardo(project, prompt);
      }
    } else {
      result = await generateWithLeonardo(project, prompt);
    }

    let images = result.images;
    if (isS3Configured()) {
      try {
        images = await persistGeneratedImages(result.images);
      } catch (s3Error) {
        console.error("S3 persist failed, using original URLs:", s3Error);
      }
    }

    const enhancer = getImagePromptEnhancer();

    return NextResponse.json({
      ...result,
      images,
      promptEnhanced: enhancer !== "none",
      promptEnhancedBy: enhancer !== "none" ? enhancer : undefined,
      storedInS3: images.some((img) => img.includes("alem.ai")),
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generation failed";
    console.error("Generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
