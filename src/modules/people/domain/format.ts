const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "20 Nov" for the same year as today, "20 Nov 2025" for another; plain calendar dates, so no time zone shift
export function formatDay(date: string, today: string): string {
  const month = MONTHS[Number(date.slice(5, 7)) - 1];
  const text = `${Number(date.slice(8, 10))} ${month}`;
  return date.slice(0, 4) === today.slice(0, 4)
    ? text
    : `${text} ${date.slice(0, 4)}`;
}
