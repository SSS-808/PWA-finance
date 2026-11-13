// A pie slice as a dash on a circle whose length is 100 (r = 15.9155); the first slice starts at 12 o'clock
export function pieSlices(
  shares: readonly number[],
): { length: number; offset: number }[] {
  let start = 0;
  return shares.map((share) => {
    const percent = share * 100;
    const slice = {
      length: shares.length > 1 ? Math.max(percent - 0.4, 0) : 100,
      offset: (125 - start) % 100,
    };
    start += percent;
    return slice;
  });
}

function formatMonth(
  month: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

// "November"
export function monthName(month: string): string {
  return formatMonth(month, { month: "long" });
}

// "Nov"
export function monthShort(month: string): string {
  return formatMonth(month, { month: "short" });
}

// "November 2026"
export function monthYear(month: string): string {
  return formatMonth(month, { month: "long", year: "numeric" });
}

// "May–Oct 2026", or "Nov 2025–Apr 2026" across a year end
export function monthRangeLabel(from: string, to: string): string {
  const withYear = (month: string) =>
    formatMonth(month, { month: "short", year: "numeric" });
  if (from === to) return withYear(from);
  const start =
    from.slice(0, 4) === to.slice(0, 4) ? monthShort(from) : withYear(from);
  return `${start}–${withYear(to)}`;
}

// "13 Nov" from a date like 2026-11-13
export function dayMonth(date: string): string {
  return `${Number(date.slice(8, 10))} ${monthShort(date.slice(0, 7))}`;
}

// The month after a month (YYYY-MM), a given number of steps on
export function monthAfter(month: string, steps: number): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1;
  return new Date(Date.UTC(year, index + steps, 1)).toISOString().slice(0, 7);
}
