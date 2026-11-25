import { ToastOnce } from "@/components/shared/toast-once";
import { en } from "@/messages/en";

type NoticeKey = keyof typeof en.people.notices;

function isNoticeKey(value: string): value is NoticeKey {
  return value in en.people.notices;
}

// Toasts the message for a ?notice= value; nothing for an unknown one
export function PeopleNotice({ notice }: { notice?: string | string[] }) {
  if (typeof notice !== "string" || !isNoticeKey(notice)) return null;
  return <ToastOnce message={en.people.notices[notice]} param="notice" />;
}
