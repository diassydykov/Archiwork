import type { ProjectDetails } from "@/types";
import { buildArchitecturalPrompt } from "@/lib/ai/prompt";

const DEFAULT_LLM_URL = "https://llm.alem.ai";

function getConfig() {
  return {
    apiKey: process.env.QWEN_API_KEY,
    baseUrl: process.env.ALEM_LLM_URL ?? DEFAULT_LLM_URL,
    model: process.env.QWEN_MODEL ?? "qwen3-6",
  };
}

export async function enhanceArchitecturalPrompt(
  project: ProjectDetails
): Promise<string> {
  const basePrompt = buildArchitecturalPrompt(project);
  const { apiKey, baseUrl, model } = getConfig();

  if (!apiKey) {
    return basePrompt;
  }

  try {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are an expert architectural visualization prompt engineer. Create a detailed English prompt for AI image generation of buildings. Output ONLY the prompt text, no explanations or quotes.",
          },
          {
            role: "user",
            content: `Improve this architectural visualization prompt based on the project details:\n\n${basePrompt}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("Qwen API error:", await res.text());
      return basePrompt;
    }

    const data = await res.json();
    const enhanced = data.choices?.[0]?.message?.content?.trim();

    return enhanced || basePrompt;
  } catch (error) {
    console.error("Qwen enhancement failed:", error);
    return basePrompt;
  }
}
