import { chatWithQwen } from "@/lib/alem/chat";
import type { ProjectDetails } from "@/types";

export async function generateProjectSpecification(
  project: ProjectDetails
): Promise<string> {
  const context = [
    `Building type: ${project.buildingType}`,
    `Description: ${project.description}`,
    project.area && `Area: ${project.area} m²`,
    project.floors && `Floors: ${project.floors}`,
    project.style && `Style: ${project.style}`,
    project.location && `Location: ${project.location}`,
    project.wishes && `Client wishes: ${project.wishes}`,
    project.additional && `Additional: ${project.additional}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    return await chatWithQwen(
      [
        {
          role: "user",
          content: `Create a detailed architectural project specification based on this brief:\n\n${context}`,
        },
      ],
      `You are a licensed architect preparing preliminary project documentation (эскизный проект / sketch design).
Output a structured specification in Russian with these sections:
1. **Общие данные** — назначение, площадь, этажность, стиль
2. **Участок** — ориентировочные размеры участка, размещение здания, подъезд, парковка, благоустройство
3. **Планировочные решения** — по каждому этажу: список помещений с примерными размерами (м) и площадями (м²)
4. **Конструктивные решения** — фундамент, стены, перекрытия, кровля
5. **Фасадные решения** — материалы, цвета, остекление
6. **Инженерные системы** — кратко: отопление, водоснабжение, электрика
7. **Технические примечания** — важные замечания для строительства
Use realistic dimension estimates based on the brief. Use markdown formatting with headers and bullet lists. Be specific and professional.`
    );
  } catch {
    return `## Общие данные\n\n${project.description}\n\n*Техническая спецификация сгенерирована на основе вашего описания.*`;
  }
}
