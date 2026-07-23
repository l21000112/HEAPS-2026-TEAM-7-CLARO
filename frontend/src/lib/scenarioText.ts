const NAME_TOKEN = /\{\{\s*name\s*\}\}/gi;

export function personalizeScenarioText(text: string, displayName?: string | null): string {
  if (!text) return text;
  const name = displayName?.trim() || 'there';
  return text.replace(NAME_TOKEN, name);
}
