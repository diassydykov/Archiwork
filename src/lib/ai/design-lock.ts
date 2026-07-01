import { chatWithQwen } from "@/lib/alem/chat";
import { isGrokConfigured, chatWithGrok } from "@/lib/xai/grok";
import type { ProjectDetails } from "@/types";

const DESIGN_LOCK_MAX = 400;

function buildContext(project: ProjectDetails, specification: string): string {
  return [
    `Type: ${project.buildingType}`,
    `Description: ${project.description}`,
    project.area && `Area: ${project.area} m²`,
    project.floors && `Floors: ${project.floors}`,
    project.style && `Style: ${project.style}`,
    project.location && `Location: ${project.location}`,
    project.wishes && `Client wishes: ${project.wishes}`,
    project.additional && `Additional: ${project.additional}`,
    "",
    "Specification:",
    specification.slice(0, 2500),
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM_PROMPT = `You are a licensed architect preparing ONE cohesive sketch design.
From the client brief and specification, define a single fixed building that ALL drawings will depict.

Output ONE dense English paragraph (max 380 characters) describing:
- Footprint shape and approximate size (e.g. rectangular 12x18m, L-shaped)
- Floor count and roof type/material/color
- Facade materials and colors
- Window pattern and main entrance location
- Room layout summary per floor (kitchen, living, bedrooms count)
- Key features from client wishes

Rules:
- Same building for site plan, floor plans, elevations, section, 3D render
- Be specific and realistic based on client requirements
- No markdown, no bullets, no quotes
- Output ONLY the design lock paragraph`;

async function generateWithLlm(context: string): Promise<string> {
  const messages = [{ role: "user" as const, content: context }];

  if (isGrokConfigured()) {
    return chatWithGrok(messages, SYSTEM_PROMPT);
  }

  if (process.env.QWEN_API_KEY) {
    return chatWithQwen(messages, SYSTEM_PROMPT);
  }

  throw new Error("No LLM configured for design lock");
}

function fallbackDesignLock(project: ProjectDetails): string {
  return [
    project.buildingType === "commercial" ? "Commercial building" : "Private house",
    project.floors && `${project.floors} floors`,
    project.area && `${project.area} sqm`,
    project.style && `${project.style} style`,
    project.description.slice(0, 120),
  ]
    .filter(Boolean)
    .join(", ")
    .slice(0, DESIGN_LOCK_MAX);
}

export async function generateDesignLock(
  project: ProjectDetails,
  specification: string
): Promise<string> {
  try {
    const raw = await generateWithLlm(buildContext(project, specification));
    const lock = raw.replace(/\s+/g, " ").trim().slice(0, DESIGN_LOCK_MAX);
    if (lock.length > 50) return lock;
  } catch (error) {
    console.error("Design lock generation failed:", error);
  }

  return fallbackDesignLock(project);
}
