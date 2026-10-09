import Link from "next/link";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import { displayBalance, groupByCurrency } from "../domain/calculations";
import type { Account } from "../domain/types";

function AccountRow({ account }: { account: Account }) {
  const { amount, owed } = displayBalance(account.type, account.balance);
  return (
    <li>
      <Link
        href={`/accounts/${account.id}`}
        className="flex min-h-14 items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted"
      >
        <span className="min-w-0">
          <span className="block text-base font-medium break-words">
            {account.name}
          </span>
          <span className="block text-sm text-muted-foreground">
            {en.accounts.types[account.type]}
          </span>
        </span>
        <span className="shrink-0 text-right text-base tabular-nums">
          {formatMoney(amount)}
          {owed ? (
            <span className="text-muted-foreground"> {en.accounts.owed}</span>
          ) : null}
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
        <h2 id="accounts-archived" className="text-xl font-semibold">
          {en.accounts.archivedTitle}
        </h2>
        <ul>
          {accounts.map((account) => (
            <AccountRow key={account.id} account={account} />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {groupByCurrency(accounts).map((group) => (
        <section
          key={group.currency}
          aria-labelledby={`accounts-${group.currency}`}
          className="space-y-2"
        >
          <h2
            id={`accounts-${group.currency}`}
            className="text-xl font-semibold"
          >
            {en.currencies[group.currency]}
          </h2>
          <ul>
            {group.accounts.map((account) => (
              <AccountRow key={account.id} account={account} />
            ))}
          </ul>
          <p className="flex items-center justify-between gap-3 border-t border-border px-3 pt-3 text-base font-medium">
            <span>{en.accounts.total}</span>
            <span className="tabular-nums">{formatMoney(group.total)}</span>
          </p>
        </section>
      ))}
    </div>
  );
}
