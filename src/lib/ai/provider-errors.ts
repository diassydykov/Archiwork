export class ImageProviderError extends Error {
  constructor(
    public readonly code: "LEONARDO_NO_TOKENS" | "NO_PROVIDER",
    message: string
  ) {
    super(message);
    this.name = "ImageProviderError";
  }
}

export function isLeonardoTokensExhausted(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not enough api tokens/i.test(message);
}

export function mapImageProviderError(error: unknown): ImageProviderError | null {
  if (error instanceof ImageProviderError) return error;

  if (isLeonardoTokensExhausted(error)) {
    return new ImageProviderError(
      "LEONARDO_NO_TOKENS",
      "Leonardo API tokens exhausted"
    );
  }

  return null;
}
