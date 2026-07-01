import { chatWithGrok } from "@/lib/xai/grok";
import { isGrokConfigured } from "@/lib/xai/grok";
import { LEONARDO_PROMPT_MAX_LENGTH, truncatePrompt } from "@/lib/ai/prompt-limit";

export function staticSanitizeImagePrompt(
  prompt: string,
  blueprint?: boolean
): string {
  const base = blueprint
    ? "Professional architectural schematic line drawing of a modern residential building. Black ink lines on white paper. Floor plan or elevation view. No text, no labels, no people. Technical CAD style. Family home."
    : "Professional photorealistic architectural exterior visualization of a modern residential building. Daylight, clear sky, landscaping. No people. Family home exterior render.";

  const hints = prompt
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 350);

  return truncatePrompt(`${base} Design: ${hints}`, LEONARDO_PROMPT_MAX_LENGTH);
}

export async function sanitizeImagePrompt(
  prompt: string,
  blueprint?: boolean
): Promise<string> {
  if (!isGrokConfigured()) {
    return staticSanitizeImagePrompt(prompt, blueprint);
  }

  try {
    const safe = await chatWithGrok(
      [
        {
          role: "user",
          content: `Rewrite this image-generation prompt so it passes strict content moderation filters. Keep only safe professional architectural content: buildings, floor plans, elevations, landscapes. Remove anything that could trigger moderation. No people, no violence, no sensitive topics. English only. Max 1200 characters.\n\nOriginal:\n${prompt}`,
        },
      ],
      "You rewrite prompts for architectural image AI. Output ONLY the safe prompt text."
    );
    return truncatePrompt(safe, LEONARDO_PROMPT_MAX_LENGTH);
  } catch {
    return staticSanitizeImagePrompt(prompt, blueprint);
  }
}
