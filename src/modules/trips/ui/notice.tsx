import { ToastOnce } from "@/components/shared/toast-once";
import { en } from "@/messages/en";

type NoticeKey = "added" | "saved" | "deleted";

function isNoticeKey(value: string): value is NoticeKey {
  return value === "added" || value === "saved" || value === "deleted";
}

function entryCount(count?: string | string[]): number {
  const value = typeof count === "string" ? Number(count) : 0;
  return Number.isInteger(value) && value > 0 ? value : 0;
}

// Toasts the message for a ?notice= value; nothing for an unknown one; name is the trip, for the labelled notice
export function TripNotice({
  notice,
  count,
  name,
}: {
  notice?: string | string[];
  count?: string | string[];
  name?: string;
}) {
  if (typeof notice !== "string") return null;
  if (notice === "labelled" && name) {
    const n = entryCount(count);
    if (n === 0) return null;
    const message =
      n === 1 ? en.trips.notices.labelledOne : en.trips.notices.labelled;
    return (
      <ToastOnce
        message={message
          .replace("{n}", String(n))
          .replace("{name}", () => name)}
        param="notice"
      />
    );
  }
  if (!isNoticeKey(notice)) return null;
  return <ToastOnce message={en.trips.notices[notice]} param="notice" />;
}
