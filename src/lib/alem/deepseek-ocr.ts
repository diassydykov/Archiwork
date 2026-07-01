const DEFAULT_LLM_URL = "https://llm.alem.ai";

export async function extractTextFromImage(imageUrl: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_OCR_API_KEY;
  const baseUrl = process.env.ALEM_LLM_URL ?? DEFAULT_LLM_URL;

  if (!apiKey) {
    throw new Error("DEEPSEEK_OCR_API_KEY is not configured");
  }

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-ocr",
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
            {
              type: "text",
              text: "Extract all text from this architectural document or floor plan. Return structured text.",
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Deepseek OCR error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
