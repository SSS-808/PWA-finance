import Link from "next/link";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import { groupByCurrency, groupByName } from "../domain/calculations";
import type { Account } from "../domain/types";
import { AccountTypeIcon } from "./account-type-icon";
import { balanceText } from "./balance-text";
import { CurrencyRow } from "./currency-row";

function ArchivedRow({ account }: { account: Account }) {
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
              {en.accounts.types[account.type]} ·{" "}
              {en.currencies[account.currency]}
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

// Active accounts show a total per currency, then one card per name with a row per currency; archived ones are a plain list
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
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {accounts.map((account) => (
            <ArchivedRow key={account.id} account={account} />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="accounts-totals" className="space-y-2">
        <h2
          id="accounts-totals"
          className="px-1 text-sm font-medium text-muted-foreground"
        >
          {en.accounts.totalsLabel}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {groupByCurrency(accounts).map((group) => (
            <li
              key={group.currency}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-base font-semibold tabular-nums"
            >
              {formatMoney(group.total)}
            </li>
          ))}
        </ul>
      </section>
      {groupByName(accounts).map((group) => {
        const first = group.accounts[0];
        const headingId = `account-card-${first.id}`;
        return (
          <section
            key={first.id}
            aria-labelledby={headingId}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              <AccountTypeIcon type={first.type} />
              <div className="min-w-0">
                <h2
                  id={headingId}
                  className="text-base font-semibold break-words"
                >
                  {group.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {en.accounts.types[first.type]}
                </p>
              </div>
            </div>
            <ul className="divide-y divide-border border-t border-border">
              {group.accounts.map((account) => (
                <CurrencyRow key={account.id} account={account} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
