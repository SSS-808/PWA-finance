import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import type { Account } from "../domain/types";
import { balanceText } from "./balance-text";

// One currency of an account name: the currency, its balance and a link to that account
export function CurrencyRow({ account }: { account: Account }) {
  const { text, owed } = balanceText(account.type, account.balance);
  return (
    <li>
      <Link
        href={`/accounts/${account.id}`}
        className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-muted"
      >
        <span className="text-base">
          <span className="sr-only">{account.name}, </span>
          {en.currencies[account.currency]}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "text-right text-base font-medium tabular-nums",
              owed && "text-expense",
            )}
          >
            {text}
          </span>
          <ChevronRight
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
        </span>
      </Link>
    </li>
  );
}
