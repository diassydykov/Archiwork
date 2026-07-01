import { generateWithLeonardo } from "@/lib/leonardo/client";
import { generateWithStability } from "@/lib/stability/client";
import {
  generateWithGrokImagine,
  isGrokImagineConfigured,
} from "@/lib/xai/imagine";
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

export type ImageFallbackProvider = "grok-imagine" | "stability";

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
  fallbackProvider?: ImageFallbackProvider;
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
  const hasGrokImagine = isGrokImagineConfigured();

  if (!hasStability && !hasLeonardo && !hasGrokImagine) {
    throw new ImageProviderError("NO_PROVIDER", "No AI provider configured");
  }

  const leonardoSize =
    aspectRatio === "1:1"
      ? { width: 1024, height: 1024 }
      : aspectRatio === "4:5"
        ? { width: 832, height: 1024 }
        : { width: 1024, height: 768 };

  async function runGrokImagine() {
    const result = await generateWithGrokImagine(prompt, aspectRatio, {
      blueprint: options?.blueprint,
    });
    return {
      image: result.images[0],
      provider: result.provider,
      prompt: result.prompt,
    };
  }

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

  async function runFallback(): Promise<{
    image: string;
    provider: string;
    prompt: string;
    fallbackProvider: ImageFallbackProvider;
  }> {
    if (hasGrokImagine) {
      try {
        const grok = await runGrokImagine();
        return { ...grok, fallbackProvider: "grok-imagine" };
      } catch (grokError) {
        console.warn("Grok Imagine failed:", grokError);
        if (!hasStability) throw grokError;
      }
    }

    if (hasStability) {
      const stability = await runStability();
      return { ...stability, fallbackProvider: "stability" };
    }

    throw new ImageProviderError(
      "LEONARDO_NO_TOKENS",
      "Leonardo tokens exhausted and no fallback provider available"
    );
  }

  const tryLeonardoFirst = hasLeonardo && (options?.preferLeonardo ?? false);

  if (tryLeonardoFirst) {
    try {
      return await runLeonardo();
    } catch (error) {
      if (isLeonardoTokensExhausted(error) || hasGrokImagine || hasStability) {
        console.warn("Leonardo unavailable — trying Grok Imagine / Stability");
        const fallback = await runFallback();
        return {
          ...fallback,
          fallbackFromLeonardo: true,
          fallbackProvider: fallback.fallbackProvider,
        };
      }
      throw error;
    }
  }

  if (hasGrokImagine && !hasLeonardo) {
    return runGrokImagine();
  }

  if (hasStability && !hasLeonardo) {
    try {
      return await runStability();
    } catch (error) {
      if (hasGrokImagine) return runGrokImagine();
      throw error;
    }
  }

  if (!hasLeonardo) {
    throw new ImageProviderError("NO_PROVIDER", "No image provider available");
  }

  try {
    return await runLeonardo();
  } catch (error) {
    if (isLeonardoTokensExhausted(error) || hasGrokImagine || hasStability) {
      const fallback = await runFallback();
      return {
        ...fallback,
        fallbackFromLeonardo: true,
        fallbackProvider: fallback.fallbackProvider,
      };
    }
    throw error;
  }
}
