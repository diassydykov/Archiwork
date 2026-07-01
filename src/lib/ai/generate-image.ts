import { generateWithLeonardo } from "@/lib/leonardo/client";
import { generateWithStability } from "@/lib/stability/client";
import type { ProjectDetails } from "@/types";

export async function generateImageFromPrompt(
  prompt: string,
  aspectRatio: "16:9" | "1:1" | "4:5" = "16:9"
): Promise<{ image: string; provider: string; prompt: string }> {
  const stubProject: ProjectDetails = {
    buildingType: "residential",
    description: prompt,
    area: "",
    floors: "",
    style: "",
    budget: "",
    location: "",
    wishes: "",
    additional: "",
  };

  const hasStability = !!process.env.STABILITY_API_KEY;
  const hasLeonardo = !!process.env.LEONARDO_API_KEY;

  if (!hasStability && !hasLeonardo) {
    throw new Error("No AI provider configured");
  }

  if (hasStability) {
    try {
      const result = await generateWithStability(
        stubProject,
        prompt,
        aspectRatio
      );
      return {
        image: result.images[0],
        provider: result.provider,
        prompt: result.prompt,
      };
    } catch (err) {
      if (!hasLeonardo) throw err;
    }
  }

  const leonardoSize =
    aspectRatio === "1:1"
      ? { width: 1024, height: 1024 }
      : aspectRatio === "4:5"
        ? { width: 832, height: 1024 }
        : { width: 1024, height: 768 };

  const result = await generateWithLeonardo(
    stubProject,
    prompt,
    leonardoSize
  );
  return {
    image: result.images[0],
    provider: result.provider,
    prompt: result.prompt,
  };
}
