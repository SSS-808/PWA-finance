// By position first; ties go in alphabetical order, ignoring upper and lower case
export function sortByPosition<T extends { position: number; name: string }>(
  rows: readonly T[],
): T[] {
  return [...rows].sort(
    (a, b) =>
      a.position - b.position ||
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );
}
