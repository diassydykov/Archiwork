import { generateProceduralLayout } from "@/lib/layout/procedural-layout";
import type { BuildingLayout } from "@/lib/layout/schema";
import type { ProjectDetails } from "@/types";

export function buildFallbackLayout(project: ProjectDetails): BuildingLayout {
  const nonce = `fallback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return generateProceduralLayout(project, nonce);
}
