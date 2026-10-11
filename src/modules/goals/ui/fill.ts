// Replaces the placeholders in a text; a function keeps "$" in amounts literal
export function fill(text: string, values: Record<string, string>): string {
  return text.replace(
    /\{(\w+)\}/g,
    (match, key: string) => values[key] ?? match,
  );
}
