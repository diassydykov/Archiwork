import type { Locale } from "@/types";

const DEFAULT_LLM_URL = "https://llm.alem.ai";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function getConfig() {
  return {
    apiKey: process.env.QWEN_API_KEY,
    baseUrl: process.env.ALEM_LLM_URL ?? DEFAULT_LLM_URL,
    model: process.env.QWEN_MODEL ?? "qwen3-6",
  };
}

export async function chatWithQwen(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const { apiKey, baseUrl, model } = getConfig();

  if (!apiKey) {
    throw new Error("QWEN_API_KEY is not configured");
  }

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Qwen API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Empty response from Qwen");
  }

  return content;
}

export function getAssistantSystemPrompt(
  locale: Locale,
  buildingType?: "residential" | "commercial"
): string {
  const typeHint =
    buildingType === "commercial"
      ? "commercial building (mall, office, store)"
      : buildingType === "residential"
        ? "private house, cottage, or townhouse"
        : "private or commercial building";

  const prompts: Record<Locale, string> = {
    ru: `Ты дружелюбный архитектурный ассистент Archiwork. Помогаешь клиенту описать проект ${typeHint}: площадь, этажность, стиль, материалы, планировку, пожелания. Задавай уточняющие вопросы. Отвечай кратко и по делу на русском. В конце можешь предложить готовый текст описания для формы.`,
    kk: `Сен Archiwork сәулет көмекшісісің. Клиентке ${typeHint} жобасын сипаттауға көмектесесің: аудан, қабат, стиль, материалдар, жоспарлау, тілектер. Қысқа нақтылау сұрақтары қой. Қазақ тілінде жауап бер. Соңында формаға дайын сипаттама ұсынуға болады.`,
    en: `You are Archiwork architectural assistant. Help the client describe a ${typeHint}: area, floors, style, materials, layout, wishes. Ask short clarifying questions. Reply concisely in English. You may offer a ready description text for the project form.`,
  };

  return prompts[locale];
}
