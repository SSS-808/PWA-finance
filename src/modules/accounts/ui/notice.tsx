import { en } from "@/messages/en";

type NoticeKey = keyof typeof en.accounts.notices;

function isNoticeKey(value: string): value is NoticeKey {
  return Object.hasOwn(en.accounts.notices, value);
}

// Shows the message for a ?notice= value, and nothing for an unknown one
export function Notice({ notice }: { notice?: string | string[] }) {
  if (typeof notice !== "string" || !isNoticeKey(notice)) return null;
  return (
    <p
      role="status"
      className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
    >
      {en.accounts.notices[notice]}
    </p>
  );
}
