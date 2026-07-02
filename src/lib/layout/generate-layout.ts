import { generateProceduralLayout } from "@/lib/layout/procedural-layout";
import type { BuildingLayout } from "@/lib/layout/schema";
import type { ProjectDetails } from "@/types";

/**
 * Генерация планировки — процедурная библиотека из 100+ вариантов.
 * LLM не используется: планировки основаны на архитектурных шаблонах
 * (зонирование, смежность, стояк санузлов) с уникальным seed каждый раз.
 */
export async function generateBuildingLayout(
  project: ProjectDetails,
  _specification: string
): Promise<BuildingLayout> {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return generateProceduralLayout(project, nonce);
}
