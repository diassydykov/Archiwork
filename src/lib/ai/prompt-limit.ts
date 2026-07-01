export const LEONARDO_PROMPT_MAX_LENGTH = 1500;

export function truncatePrompt(
  text: string,
  max = LEONARDO_PROMPT_MAX_LENGTH
): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  if (max <= 1) return trimmed.slice(0, max);
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
