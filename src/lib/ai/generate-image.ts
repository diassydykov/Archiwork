import { generateWithLeonardo } from "@/lib/leonardo/client";
import { generateWithStability } from "@/lib/stability/client";
import {
  ImageProviderError,
  isLeonardoTokensExhausted,
} from "@/lib/ai/provider-errors";
import type { ProjectDetails } from "@/types";

export interface GenerateImageOptions {
  referenceImageId?: string;
  blueprint?: boolean;
  /** When true, try Leonardo first (for style reference chain). */
  preferLeonardo?: boolean;
}

export async function generateImageFromPrompt(
  prompt: string,
  aspectRatio: "16:9" | "1:1" | "4:5" = "16:9",
  options?: GenerateImageOptions
): Promise<{
  image: string;
  provider: string;
  prompt: string;
  referenceImageId?: string;
  fallbackFromLeonardo?: boolean;
}> {
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
    throw new ImageProviderError("NO_PROVIDER", "No AI provider configured");
  }

  const leonardoSize =
    aspectRatio === "1:1"
      ? { width: 1024, height: 1024 }
      : aspectRatio === "4:5"
        ? { width: 832, height: 1024 }
        : { width: 1024, height: 768 };

  async function runStability() {
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
  }

  async function runLeonardo() {
    const result = await generateWithLeonardo(stubProject, prompt, {
      ...leonardoSize,
      referenceImageId: options?.referenceImageId,
      blueprint: options?.blueprint,
      enhancePrompt: !options?.blueprint,
    });
    return {
      image: result.images[0],
      provider: result.provider,
      prompt: result.prompt,
      referenceImageId: result.referenceImageId,
    };
  }

  const tryLeonardoFirst = hasLeonardo && (options?.preferLeonardo ?? false);

  if (tryLeonardoFirst) {
    try {
      return await runLeonardo();
    } catch (error) {
      if (isLeonardoTokensExhausted(error) && hasStability) {
        console.warn(
          "Leonardo tokens exhausted — falling back to Stability AI"
        );
        const stability = await runStability();
        return { ...stability, fallbackFromLeonardo: true };
      }

      if (isLeonardoTokensExhausted(error)) {
        throw new ImageProviderError(
          "LEONARDO_NO_TOKENS",
          "Leonardo API tokens exhausted"
        );
      }

      if (hasStability) {
        console.warn("Leonardo failed — falling back to Stability AI:", error);
        const stability = await runStability();
        return { ...stability, fallbackFromLeonardo: true };
      }

      throw error;
    }
  }

  if (hasStability) {
    try {
      return await runStability();
    } catch (error) {
      if (!hasLeonardo) throw error;
    }
  }

  if (!hasLeonardo) {
    throw new ImageProviderError("NO_PROVIDER", "No image provider available");
  }

  try {
    return await runLeonardo();
  } catch (error) {
    if (isLeonardoTokensExhausted(error)) {
      throw new ImageProviderError(
        "LEONARDO_NO_TOKENS",
        "Leonardo API tokens exhausted"
      );
    }
    throw error;
  }
}
