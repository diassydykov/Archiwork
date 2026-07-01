import { generateWithLeonardo } from "@/lib/leonardo/client";
import { generateWithStability } from "@/lib/stability/client";
import {
  generateWithGrokImagine,
  isGrokImagineConfigured,
} from "@/lib/xai/imagine";
import {
  ImageProviderError,
  isContentModerationBlocked,
  isLeonardoTokensExhausted,
} from "@/lib/ai/provider-errors";
import { sanitizeImagePrompt } from "@/lib/ai/sanitize-prompt";
import type { ProjectDetails } from "@/types";

export interface GenerateImageOptions {
  referenceImageId?: string;
  blueprint?: boolean;
  preferLeonardo?: boolean;
}

export type ImageFallbackProvider = "grok-imagine" | "stability";

type ProviderResult = {
  image: string;
  provider: string;
  prompt: string;
  referenceImageId?: string;
};

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
  usedSafePrompt?: boolean;
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

  async function runGrokImagine(safePrompt: string) {
    const result = await generateWithGrokImagine(safePrompt, aspectRatio, {
      blueprint: options?.blueprint,
    });
    return {
      image: result.images[0],
      provider: result.provider,
      prompt: result.prompt,
    };
  }

  async function runStability(safePrompt: string) {
    const result = await generateWithStability(
      stubProject,
      safePrompt,
      aspectRatio
    );
    return {
      image: result.images[0],
      provider: result.provider,
      prompt: result.prompt,
    };
  }

  async function runLeonardo(safePrompt: string) {
    const result = await generateWithLeonardo(stubProject, safePrompt, {
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

  async function withModerationRetry(
    run: (safePrompt: string) => Promise<ProviderResult>
  ): Promise<{ result: ProviderResult; usedSafePrompt: boolean }> {
    try {
      const result = await run(prompt);
      return { result, usedSafePrompt: false };
    } catch (error) {
      if (!isContentModerationBlocked(error)) throw error;

      const safePrompt = await sanitizeImagePrompt(prompt, options?.blueprint);
      console.warn("Content moderation blocked — retrying with safe prompt");

      try {
        const result = await run(safePrompt);
        return { result, usedSafePrompt: true };
      } catch (retryError) {
        if (isContentModerationBlocked(retryError)) {
          throw new ImageProviderError(
            "CONTENT_MODERATION",
            "Content moderation blocked the request"
          );
        }
        throw retryError;
      }
    }
  }

  async function runFallback(): Promise<{
    result: ProviderResult;
    fallbackProvider: ImageFallbackProvider;
    usedSafePrompt: boolean;
  }> {
    const errors: unknown[] = [];

    if (hasGrokImagine) {
      try {
        const { result, usedSafePrompt } = await withModerationRetry(runGrokImagine);
        return { result, fallbackProvider: "grok-imagine", usedSafePrompt };
      } catch (error) {
        errors.push(error);
        console.warn("Grok Imagine failed:", error);
      }
    }

    if (hasStability) {
      try {
        const { result, usedSafePrompt } = await withModerationRetry(runStability);
        return { result, fallbackProvider: "stability", usedSafePrompt };
      } catch (error) {
        errors.push(error);
        console.warn("Stability failed:", error);
      }
    }

    const moderation = errors.find(isContentModerationBlocked);
    if (moderation) {
      throw new ImageProviderError(
        "CONTENT_MODERATION",
        "Content moderation blocked the request"
      );
    }

    if (isLeonardoTokensExhausted(errors[0])) {
      throw new ImageProviderError(
        "LEONARDO_NO_TOKENS",
        "Leonardo tokens exhausted"
      );
    }

    throw errors[0] ?? new ImageProviderError("NO_PROVIDER", "No provider");
  }

  const tryLeonardoFirst = hasLeonardo && (options?.preferLeonardo ?? false);

  if (tryLeonardoFirst) {
    try {
      const { result, usedSafePrompt } = await withModerationRetry(runLeonardo);
      return { ...result, usedSafePrompt };
    } catch (error) {
      const canFallback =
        isLeonardoTokensExhausted(error) ||
        isContentModerationBlocked(error) ||
        hasGrokImagine ||
        hasStability;

      if (canFallback) {
        console.warn("Leonardo unavailable — trying Grok Imagine / Stability");
        const fallback = await runFallback();
        return {
          ...fallback.result,
          fallbackFromLeonardo: true,
          fallbackProvider: fallback.fallbackProvider,
          usedSafePrompt: fallback.usedSafePrompt,
        };
      }
      throw error;
    }
  }

  if (hasGrokImagine && !hasLeonardo) {
    const { result, usedSafePrompt } = await withModerationRetry(runGrokImagine);
    return { ...result, usedSafePrompt };
  }

  if (hasStability && !hasLeonardo) {
    try {
      const { result, usedSafePrompt } = await withModerationRetry(runStability);
      return { ...result, usedSafePrompt };
    } catch (error) {
      if (hasGrokImagine && !isContentModerationBlocked(error)) {
        const grok = await withModerationRetry(runGrokImagine);
        return { ...grok.result, usedSafePrompt: grok.usedSafePrompt };
      }
      throw error;
    }
  }

  if (!hasLeonardo) {
    throw new ImageProviderError("NO_PROVIDER", "No image provider available");
  }

  try {
    const { result, usedSafePrompt } = await withModerationRetry(runLeonardo);
    return { ...result, usedSafePrompt };
  } catch (error) {
    const canFallback =
      isLeonardoTokensExhausted(error) ||
      isContentModerationBlocked(error) ||
      hasGrokImagine ||
      hasStability;

    if (canFallback) {
      const fallback = await runFallback();
      return {
        ...fallback.result,
        fallbackFromLeonardo: true,
        fallbackProvider: fallback.fallbackProvider,
        usedSafePrompt: fallback.usedSafePrompt,
      };
    }
    throw error;
  }
}
