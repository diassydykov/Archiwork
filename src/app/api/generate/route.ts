import { NextResponse } from "next/server";
import { enhanceArchitecturalPrompt } from "@/lib/alem/qwen";
import { persistGeneratedImages } from "@/lib/alem/s3";
import { generateWithLeonardo } from "@/lib/leonardo/client";
import { generateWithStability } from "@/lib/stability/client";
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

    const hasLeonardo = !!process.env.LEONARDO_API_KEY;
    const hasStability = !!process.env.STABILITY_API_KEY;

    if (!hasLeonardo && !hasStability) {
      return NextResponse.json(
        { error: "No AI provider configured" },
        { status: 500 }
      );
    }

    const prompt = await enhanceArchitecturalPrompt(project);

    let result: { prompt: string; provider: string; images: string[] };

    if (hasLeonardo) {
      try {
        result = await generateWithLeonardo(project, prompt);
      } catch (leonardoError) {
        console.error("Leonardo failed, trying Stability:", leonardoError);

        if (!hasStability) {
          throw leonardoError;
        }

        result = await generateWithStability(project, prompt);
      }
    } else {
      result = await generateWithStability(project, prompt);
    }

    const images = await persistGeneratedImages(result.images);

    return NextResponse.json({
      ...result,
      images,
      promptEnhanced: !!process.env.QWEN_API_KEY,
      storedInS3: images.some((img) => img.includes("alem.ai")),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generation failed";
    console.error("Generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
