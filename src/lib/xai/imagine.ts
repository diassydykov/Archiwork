function getConfig() {
  return {
    apiKey: process.env.GROK_API_KEY ?? process.env.XAI_API_KEY,
    baseUrl: process.env.GROK_API_URL ?? "https://api.x.ai/v1",
    model: process.env.GROK_IMAGE_MODEL ?? "grok-imagine-image",
  };
}

export function isGrokImagineConfigured(): boolean {
  return !!(process.env.GROK_API_KEY ?? process.env.XAI_API_KEY);
}

function mapAspectRatio(aspectRatio: "16:9" | "1:1" | "4:5"): string {
  if (aspectRatio === "4:5") return "3:4";
  return aspectRatio;
}

export async function generateWithGrokImagine(
  prompt: string,
  aspectRatio: "16:9" | "1:1" | "4:5" = "16:9",
  options?: { blueprint?: boolean }
) {
  const { apiKey, baseUrl, model } = getConfig();
  if (!apiKey) {
    throw new Error("GROK_API_KEY is not configured");
  }

  const imageModel =
    options?.blueprint === false
      ? (process.env.GROK_IMAGE_MODEL_QUALITY ?? "grok-imagine-image-quality")
      : model;

  const res = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: imageModel,
      prompt,
      aspect_ratio: mapAspectRatio(aspectRatio),
      resolution: "1k",
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Grok Imagine error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json as string | undefined;

  if (!b64) {
    throw new Error("No image returned from Grok Imagine");
  }

  return {
    images: [`data:image/png;base64,${b64}`],
    provider: "grok-imagine" as const,
    prompt,
  };
}
