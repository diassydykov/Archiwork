import type { ProjectDetails } from "@/types";
import { buildArchitecturalPrompt } from "@/lib/ai/prompt";
import { LEONARDO_PROMPT_MAX_LENGTH, truncatePrompt } from "@/lib/ai/prompt-limit";

const LEONARDO_API = "https://cloud.leonardo.ai/api/rest/v1";
const PHOENIX_MODEL_ID = "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3";

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

async function waitForGeneration(generationId: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const data = await leonardoFetch(`/generations/${generationId}`);
    const generation = data.generations_by_pk;

    if (generation?.status === "COMPLETE") {
      return generation.generated_images as { url: string }[];
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
  size?: { width: number; height: number }
) {
  if (!getApiKey()) {
    throw new Error("LEONARDO_API_KEY is not configured");
  }

  const finalPrompt = truncatePrompt(
    prompt ?? buildArchitecturalPrompt(project),
    LEONARDO_PROMPT_MAX_LENGTH
  );
  const width = size?.width ?? 1024;
  const height = size?.height ?? 768;

  const createData = await leonardoFetch("/generations", {
    method: "POST",
    body: JSON.stringify({
      modelId: PHOENIX_MODEL_ID,
      prompt: finalPrompt,
      width,
      height,
      num_images: 1,
      alchemy: true,
      contrast: 3.5,
      enhancePrompt: true,
    }),
  });

  const generationId =
    createData.sdGenerationJob?.generationId ?? createData.generationId;

  if (!generationId) {
    throw new Error("No generation ID returned from Leonardo");
  }

  const images = await waitForGeneration(generationId);
  const urls = images.map((img) => img.url).filter(Boolean);

  if (urls.length === 0) {
    throw new Error("No images returned");
  }

  return { prompt: finalPrompt, provider: "leonardo" as const, images: urls };
}
