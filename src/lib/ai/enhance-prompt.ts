import { chatWithQwen } from "@/lib/alem/chat";
import { isGrokConfigured, chatWithGrok } from "@/lib/xai/grok";
import { buildArchitecturalPrompt } from "@/lib/ai/prompt";
import {
  LEONARDO_PROMPT_MAX_LENGTH,
  truncatePrompt,
} from "@/lib/ai/prompt-limit";
import type { ProjectDetails } from "@/types";

export type ImagePromptMode = "blueprint" | "visualization";

export type PromptEnhancer = "grok" | "qwen" | "none";

function resolveEnhancer(): PromptEnhancer {
  const preference = process.env.IMAGE_PROMPT_LLM?.toLowerCase();

  if (preference === "qwen" && process.env.QWEN_API_KEY) return "qwen";
  if (preference === "grok" && isGrokConfigured()) return "grok";
  if (preference === "none") return "none";

  if (isGrokConfigured()) return "grok";
  if (process.env.QWEN_API_KEY) return "qwen";
  return "none";
}

function systemPromptForMode(mode: ImagePromptMode, maxLength: number): string {
  const limit = maxLength - 50;

  if (mode === "blueprint") {
    return `You are an expert prompt engineer for Leonardo AI architectural blueprint generation.
Improve the prompt for clear technical drawings: floor plans, elevations, sections, site plans.
Keep: drawing type, scale, dimension lines, black ink on white, CAD/blueprint style.
Output ONLY the final English prompt, no quotes or explanations.
STRICT LIMIT: ${limit} characters maximum.`;
  }

  return `You are an expert prompt engineer for Leonardo AI architectural visualization.
Improve the prompt for photorealistic exterior renders and 3D perspectives.
Output ONLY the final English prompt, no quotes or explanations.
STRICT LIMIT: ${limit} characters maximum.`;
}

async function enhanceWithProvider(
  enhancer: PromptEnhancer,
  basePrompt: string,
  mode: ImagePromptMode,
  maxLength: number
): Promise<string> {
  const systemPrompt = systemPromptForMode(mode, maxLength);
  const userMessage = `Improve this Leonardo AI prompt:\n\n${basePrompt}`;

  if (enhancer === "grok") {
    return chatWithGrok(
      [{ role: "user", content: userMessage }],
      systemPrompt
    );
  }

  if (enhancer === "qwen") {
    return chatWithQwen(
      [{ role: "user", content: userMessage }],
      systemPrompt
    );
  }

  return basePrompt;
}

export function getImagePromptEnhancer(): PromptEnhancer {
  return resolveEnhancer();
}

export async function enhanceImagePrompt(
  basePrompt: string,
  options?: { mode?: ImagePromptMode; maxLength?: number }
): Promise<{ prompt: string; enhancer: PromptEnhancer }> {
  const mode = options?.mode ?? "visualization";
  const maxLength = options?.maxLength ?? LEONARDO_PROMPT_MAX_LENGTH;
  const enhancer = resolveEnhancer();

  if (enhancer === "none") {
    return { prompt: truncatePrompt(basePrompt, maxLength), enhancer: "none" };
  }

  try {
    const enhanced = await enhanceWithProvider(
      enhancer,
      basePrompt,
      mode,
      maxLength
    );
    return {
      prompt: truncatePrompt(enhanced, maxLength),
      enhancer,
    };
  } catch (error) {
    console.error(`${enhancer} prompt enhancement failed:`, error);

    if (enhancer === "grok" && process.env.QWEN_API_KEY) {
      try {
        const enhanced = await enhanceWithProvider(
          "qwen",
          basePrompt,
          mode,
          maxLength
        );
        return {
          prompt: truncatePrompt(enhanced, maxLength),
          enhancer: "qwen",
        };
      } catch (fallbackError) {
        console.error("Qwen fallback failed:", fallbackError);
      }
    }

    return { prompt: truncatePrompt(basePrompt, maxLength), enhancer: "none" };
  }
}

export async function enhanceArchitecturalPrompt(
  project: ProjectDetails
): Promise<string> {
  const basePrompt = buildArchitecturalPrompt(project);
  const { prompt } = await enhanceImagePrompt(basePrompt, {
    mode: "visualization",
  });
  return prompt;
}
