import type { ProjectDetails } from "@/types";

export function buildArchitecturalPrompt(project: ProjectDetails): string {
  const typeLabel =
    project.buildingType === "residential"
      ? "private residential house"
      : "commercial building, shopping mall or office";

  const parts = [
    `Professional architectural visualization, photorealistic exterior render of a ${typeLabel}`,
    project.description,
    project.style && `Architectural style: ${project.style}`,
    project.area && `Total area: ${project.area} sqm`,
    project.floors && `Floors: ${project.floors}`,
    project.location && `Location: ${project.location}`,
    project.wishes && `Client requirements: ${project.wishes}`,
    project.additional,
    "Golden hour lighting, clean composition, high detail, 8k architectural photography",
  ].filter(Boolean);

  return parts.join(". ");
}
