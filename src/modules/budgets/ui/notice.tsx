import { ToastOnce } from "@/components/shared/toast-once";
import { en } from "@/messages/en";

type NoticeKey = keyof typeof en.budgets.notices;

function isNoticeKey(value: string): value is NoticeKey {
  return Object.hasOwn(en.budgets.notices, value);
}

// Toasts the message for a ?notice= value; nothing for an unknown one
export function BudgetNotice({ notice }: { notice?: string | string[] }) {
  if (typeof notice !== "string" || !isNoticeKey(notice)) return null;
  return <ToastOnce message={en.budgets.notices[notice]} param="notice" />;
}
