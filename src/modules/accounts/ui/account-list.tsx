import Link from "next/link";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import { groupByCurrency } from "../domain/calculations";
import type { Account } from "../domain/types";
import { AccountTypeIcon } from "./account-type-icon";
import { balanceText } from "./balance-text";

const cardClass =
  "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card";

function AccountRow({ account }: { account: Account }) {
  const { text, owed } = balanceText(account.type, account.balance);
  return (
    <li>
      <Link
        href={`/accounts/${account.id}`}
        className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 hover:bg-muted"
      >
        <span className="flex min-w-0 items-center gap-3">
          <AccountTypeIcon type={account.type} />
          <span className="min-w-0">
            <span className="block text-base font-medium break-words">
              {account.name}
            </span>
            <span className="block text-sm text-muted-foreground">
              {en.accounts.types[account.type]}
            </span>
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 text-right text-base font-medium tabular-nums",
            owed && "text-expense",
          )}
        >
          {text}
        </span>
      </Link>
    </li>
  );
}

// Active accounts come grouped by currency with a total; archived ones are a plain list
export function AccountList({
  accounts,
  archived = false,
}: {
  accounts: readonly Account[];
  archived?: boolean;
}) {
  if (archived) {
    return (
      <section aria-labelledby="accounts-archived" className="space-y-2">
        <h2
          id="accounts-archived"
          className="px-1 text-sm font-medium text-muted-foreground"
        >
          {en.accounts.archivedTitle}
        </h2>
        <ul className={cardClass}>
          {accounts.map((account) => (
            <AccountRow key={account.id} account={account} />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {groupByCurrency(accounts).map((group) => (
        <section
          key={group.currency}
          aria-labelledby={`accounts-${group.currency}`}
          className="space-y-2"
        >
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2
              id={`accounts-${group.currency}`}
              className="text-sm font-medium text-muted-foreground"
            >
              {en.currencies[group.currency]}
            </h2>
            <p className="text-base font-semibold tabular-nums">
              <span className="sr-only">{en.accounts.total} </span>
              {formatMoney(group.total)}
            </p>
          </div>
          <ul className={cardClass}>
            {group.accounts.map((account) => (
              <AccountRow key={account.id} account={account} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
