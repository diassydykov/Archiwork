import type { ChatMessage } from "@/lib/alem/chat";

const DEFAULT_BASE_URL = "https://api.x.ai/v1";

function getConfig() {
  return {
    apiKey: process.env.GROK_API_KEY ?? process.env.XAI_API_KEY,
    baseUrl: process.env.GROK_API_URL ?? DEFAULT_BASE_URL,
    model: process.env.GROK_MODEL ?? "grok-3-mini",
  };
}

export function isGrokConfigured(): boolean {
  return !!(process.env.GROK_API_KEY ?? process.env.XAI_API_KEY);
}

export async function chatWithGrok(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const { apiKey, baseUrl, model } = getConfig();

  if (!apiKey) {
    throw new Error("GROK_API_KEY is not configured");
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: 600,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Grok API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Empty response from Grok");
  }

  return content;
}
