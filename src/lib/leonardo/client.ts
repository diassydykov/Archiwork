import type { ProjectDetails } from "@/types";
import { buildArchitecturalPrompt } from "@/lib/ai/prompt";
import {
  LEONARDO_PROMPT_MAX_LENGTH,
  truncatePrompt,
} from "@/lib/ai/prompt-limit";

const LEONARDO_API = "https://cloud.leonardo.ai/api/rest/v1";
const PHOENIX_MODEL_ID = "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3";
const STYLE_REFERENCE_PREPROCESSOR = 67;

export const BLUEPRINT_NEGATIVE_PROMPT =
  "text, letters, words, numbers, labels, annotations, handwriting, watermark, logo, gibberish, typography, captions, scale bar text, dimension numbers, room names, title block";

export interface LeonardoGenerateOptions {
  width?: number;
  height?: number;
  referenceImageId?: string;
  blueprint?: boolean;
  enhancePrompt?: boolean;
}

export interface LeonardoImageResult {
  url: string;
  id: string;
}

function getApiKey(): string | null {
  return process.env.LEONARDO_API_KEY ?? null;
}

async function leonardoFetch(path: string, options: RequestInit = {}) {
  const key = getApiKey();
  if (!key) throw new Error("LEONARDO_API_KEY is not configured");

  const res = await fetch(`${LEONARDO_API}${path}`, {
    ...options,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Leonardo API error ${res.status}: ${body}`);
  }

  return res.json();
}

async function waitForGeneration(
  generationId: string,
  maxAttempts = 30
): Promise<LeonardoImageResult[]> {
  for (let i = 0; i < maxAttempts; i++) {
    const data = await leonardoFetch(`/generations/${generationId}`);
    const generation = data.generations_by_pk;

    if (generation?.status === "COMPLETE") {
      const images = generation.generated_images as
        | { url: string; id: string }[]
        | undefined;
      return (images ?? [])
        .filter((img) => img.url && img.id)
        .map((img) => ({ url: img.url, id: img.id }));
    }

    if (generation?.status === "FAILED") {
      throw new Error("Image generation failed");
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  throw new Error("Generation timed out");
}

export async function generateWithLeonardo(
  project: ProjectDetails,
  prompt?: string,
  sizeOrOptions?: { width: number; height: number } | LeonardoGenerateOptions
) {
  if (!getApiKey()) {
    throw new Error("LEONARDO_API_KEY is not configured");
  }

  const options: LeonardoGenerateOptions =
    sizeOrOptions && "blueprint" in sizeOrOptions
      ? sizeOrOptions
      : {
          width: sizeOrOptions?.width ?? 1024,
          height: sizeOrOptions?.height ?? 768,
        };

  const finalPrompt = truncatePrompt(
    prompt ?? buildArchitecturalPrompt(project),
    LEONARDO_PROMPT_MAX_LENGTH
  );
  const width = options.width ?? 1024;
  const height = options.height ?? 768;
  const isBlueprint = options.blueprint ?? false;
  const enhancePrompt = options.enhancePrompt ?? !isBlueprint;

  const body: Record<string, unknown> = {
    modelId: PHOENIX_MODEL_ID,
    prompt: finalPrompt,
    width,
    height,
    num_images: 1,
    alchemy: true,
    contrast: isBlueprint ? 4 : 3.5,
    enhancePrompt,
  };

  if (isBlueprint) {
    body.negative_prompt = BLUEPRINT_NEGATIVE_PROMPT;
  }

  if (options.referenceImageId) {
    body.controlnets = [
      {
        initImageId: options.referenceImageId,
        initImageType: "GENERATED",
        preprocessorId: STYLE_REFERENCE_PREPROCESSOR,
        strengthType: isBlueprint ? "Mid" : "High",
        influence: isBlueprint ? 0.35 : 0.55,
      },
    ];
  }

  const createData = await leonardoFetch("/generations", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const generationId =
    createData.sdGenerationJob?.generationId ?? createData.generationId;

  if (!generationId) {
    throw new Error("No generation ID returned from Leonardo");
  }

  const images = await waitForGeneration(generationId);

  if (images.length === 0) {
    throw new Error("No images returned");
  }

  return {
    prompt: finalPrompt,
    provider: "leonardo" as const,
    images: images.map((img) => img.url),
    imageIds: images.map((img) => img.id),
    referenceImageId: images[0].id,
  };
}
