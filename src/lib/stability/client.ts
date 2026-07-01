import type { ProjectDetails } from "@/types";
import { buildArchitecturalPrompt } from "@/lib/ai/prompt";

const STABILITY_API = "https://api.stability.ai/v2beta/stable-image/generate/core";

function getApiKey(): string {
  const key = process.env.STABILITY_API_KEY;
  if (!key) {
    throw new Error("STABILITY_API_KEY is not configured");
  }
  return key;
}

export async function generateWithStability(
  project: ProjectDetails,
  prompt?: string
) {
  const finalPrompt = prompt ?? buildArchitecturalPrompt(project);

  const form = new FormData();
  form.append("prompt", finalPrompt);
  form.append("aspect_ratio", "16:9");
  form.append("output_format", "png");

  const res = await fetch(STABILITY_API, {
    method: "POST",
    headers: {
      authorization: `Bearer ${getApiKey()}`,
      accept: "application/json",
    },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stability API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const base64 = data.image as string | undefined;

  if (!base64) {
    throw new Error("No image returned from Stability AI");
  }

  return {
    prompt: finalPrompt,
    provider: "stability" as const,
    images: [`data:image/png;base64,${base64}`],
  };
}
