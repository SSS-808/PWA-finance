// How many times each category appears; rows without a category are skipped
export function countUsage(
  categoryIds: readonly (string | null)[],
): Map<string, number> {
  const usage = new Map<string, number>();
  for (const id of categoryIds) {
    if (id !== null) usage.set(id, (usage.get(id) ?? 0) + 1);
  }
  return usage;
}

// Most-used first; ties go in alphabetical order, ignoring upper and lower case
export function sortByUsage<T extends { id: string; name: string }>(
  categories: readonly T[],
  usage: ReadonlyMap<string, number>,
): T[] {
  return [...categories].sort((a, b) => {
    const byUsage = (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0);
    if (byUsage !== 0) return byUsage;
    return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  });
}
