import { NextResponse } from "next/server";
import { chatWithQwen, getAssistantSystemPrompt } from "@/lib/alem/chat";
import type { ChatMessage } from "@/lib/alem/chat";
import type { BuildingType, Locale } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = body.messages as ChatMessage[];
    const locale = (body.locale ?? "ru") as Locale;
    const buildingType = body.buildingType as BuildingType | undefined;

    if (!messages?.length) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const reply = await chatWithQwen(
      messages.filter((m) => m.role !== "system"),
      getAssistantSystemPrompt(locale, buildingType)
    );

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant error";
    console.error("Assistant error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
