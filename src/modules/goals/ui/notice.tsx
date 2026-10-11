import { ToastOnce } from "@/components/shared/toast-once";
import { en } from "@/messages/en";

type NoticeKey = keyof typeof en.goals.notices;

function isNoticeKey(value: string): value is NoticeKey {
  return Object.hasOwn(en.goals.notices, value);
}

// Toasts the message for a ?notice= value, except the name-taken one that stays inline; nothing for an unknown one
export function GoalNotice({ notice }: { notice?: string | string[] }) {
  if (typeof notice !== "string" || !isNoticeKey(notice)) return null;
  if (notice === "unarchive_name_taken") {
    return (
      <p
        role="status"
        className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
      >
        {en.goals.notices[notice]}
      </p>
    );
  }
  return <ToastOnce message={en.goals.notices[notice]} param="notice" />;
}
