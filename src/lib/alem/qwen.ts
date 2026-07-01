import type { ProjectDetails } from "@/types";
import { buildArchitecturalPrompt } from "@/lib/ai/prompt";
import { chatWithQwen } from "@/lib/alem/chat";

export async function enhanceArchitecturalPrompt(
  project: ProjectDetails
): Promise<string> {
  const basePrompt = buildArchitecturalPrompt(project);

  try {
    return await chatWithQwen(
      [
        {
          role: "user",
          content: `Improve this architectural visualization prompt based on the project details:\n\n${basePrompt}`,
        },
      ],
      "You are an expert architectural visualization prompt engineer. Create a detailed English prompt for AI image generation of buildings. Output ONLY the prompt text, no explanations or quotes."
    );
  } catch (error) {
    console.error("Qwen enhancement failed:", error);
    return basePrompt;
  }
}
