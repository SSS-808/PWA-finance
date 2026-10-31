import { LogOut } from "lucide-react";
import { en } from "@/messages/en";
import { logOut } from "../server/actions";

export function LogoutButton() {
  return (
    <form action={logOut}>
      <button
        type="submit"
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-base font-medium text-destructive outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted"
        >
          <LogOut className="size-5" />
        </span>
        {en.auth.logout}
      </button>
    </form>
  );
}
