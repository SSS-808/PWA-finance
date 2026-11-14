// Only exact official names, so odd spellings like "asia/bangkok" or "+05:00" are never saved
export function isValidTimeZone(value: string): boolean {
  return value === "UTC" || Intl.supportedValuesOf("timeZone").includes(value);
}

// The picker list: every zone the browser knows, plus the saved one if it is missing
export function timeZoneOptions(current: string): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  const withCurrent =
    isValidTimeZone(current) && !zones.includes(current)
      ? [...zones, current]
      : zones;
  return [...withCurrent].sort();
}
