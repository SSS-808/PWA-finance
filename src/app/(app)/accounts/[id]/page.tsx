import { Pencil, Plus, Scale } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import {
  CardListSkeleton,
  HeroSkeleton,
  LoadingStatus,
  Skeleton,
} from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import {
  AccountTypeIcon,
  ArchiveButton,
  CurrencyRow,
  Notice,
  UnarchiveButton,
  balanceText,
  freeToSpend,
  getAccount,
  listAccounts,
  sameNameOthers,
} from "@/modules/accounts";
import {
  CURRENCY_CODES,
  formatMoney,
  isNegative,
  isZero,
} from "@/modules/money";
import { getProfile, todayIn } from "@/modules/profile";
import {
  HistoryList,
  SavedNotice,
  baseFilters,
  listTransactions,
} from "@/modules/transactions";

const RECENT_COUNT = 20;

export default function AccountPage({
  params,
  searchParams,
}: PageProps<"/accounts/[id]">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/accounts" label={en.accounts.detail.back} />
      <Suspense
        fallback={
          <div className="space-y-6">
            <LoadingStatus />
            <HeroSkeleton />
            <div aria-hidden="true" className="grid grid-cols-2 gap-3">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
            <CardListSkeleton rows={3} />
          </div>
        }
      >
        <AccountDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AccountDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/accounts/[id]">["params"];
  searchParams: PageProps<"/accounts/[id]">["searchParams"];
}) {
  const { id } = await params;
  const {
    notice,
    saved,
    saved_transfer: savedTransfer,
    deleted,
  } = await searchParams;
  const account = await getAccount(id);
  const [profile, days, accounts] = await Promise.all([
    getProfile(),
    listTransactions(
      { ...baseFilters(null), accountId: account.id },
      RECENT_COUNT,
    ),
    listAccounts(),
  ]);
  const others = sameNameOthers(
    account,
    accounts.filter((other) => !other.archived),
  );
  const free = isZero(account.minimum)
    ? null
    : freeToSpend(account.balance, account.minimum);

  return (
    <div className="space-y-6">
      <Notice notice={notice} />
      <SavedNotice
        saved={saved}
        savedTransfer={savedTransfer}
        deleted={deleted}
      />
      <section
        aria-labelledby="account-name"
        className="space-y-4 rounded-2xl bg-hero p-5 text-hero-foreground"
      >
        <div className="flex items-center gap-3">
          <AccountTypeIcon type={account.type} tone="hero" />
          <div className="min-w-0">
            <h1
              id="account-name"
              className="text-2xl font-semibold tracking-tight break-words"
            >
              {account.name}
            </h1>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-hero-muted">
              <span>{en.accounts.types[account.type]}</span>
              <span aria-hidden="true">·</span>
              <span>{en.currencies[account.currency]}</span>
            </p>
          </div>
        </div>
        <p className="text-xs font-medium tracking-wider text-hero-muted uppercase">
          {en.accounts.detail.balance}
        </p>
        <p className="text-4xl font-bold tracking-tight break-words tabular-nums">
          {balanceText(account.type, account.balance).text}
        </p>
      </section>
      {free ? (
        <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-baseline justify-between gap-3 px-4 py-3">
            <dt className="text-base">{en.accounts.detail.minimum}</dt>
            <dd className="text-base tabular-nums">
              {formatMoney(account.minimum)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 px-4 py-3">
            <dt className="text-base font-semibold">
              {en.accounts.detail.free}
            </dt>
            <dd
              className={cn(
                "text-base font-semibold tabular-nums",
                isNegative(free) ? "text-expense" : "text-income",
              )}
            >
              {formatMoney(free)}
            </dd>
          </div>
        </dl>
      ) : null}
      {account.archived ? (
        <div className="space-y-3">
          <Button
            asChild
            variant="outline"
            className="h-12 w-full rounded-xl bg-card text-base"
          >
            <Link href={`/accounts/${account.id}/edit`}>
              <Pencil className="size-5" aria-hidden="true" />
              {en.accounts.detail.edit}
            </Link>
          </Button>
          <UnarchiveButton id={account.id} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-xl bg-card text-base"
          >
            <Link href={`/accounts/${account.id}/edit`}>
              <Pencil className="size-5" aria-hidden="true" />
              {en.accounts.detail.edit}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-xl bg-card text-base"
          >
            <Link href={`/accounts/${account.id}/fix-balance`}>
              <Scale className="size-5" aria-hidden="true" />
              {en.accounts.fix.title}
            </Link>
          </Button>
        </div>
      )}
      {account.archived ? null : (
        <section aria-labelledby="account-currencies" className="space-y-2">
          <h2
            id="account-currencies"
            className="px-1 text-sm font-medium text-muted-foreground"
          >
            {en.accounts.otherCurrencies.replace("{name}", () => account.name)}
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {others.map((other) => (
              <CurrencyRow key={other.id} account={other} />
            ))}
            {others.length + 1 < CURRENCY_CODES.length ? (
              <li>
                <Link
                  href={`/accounts/new?name=${encodeURIComponent(account.name)}&type=${account.type}`}
                  className="flex min-h-14 items-center gap-2 px-4 py-3 font-medium text-primary hover:bg-muted"
                >
                  <Plus className="size-5" aria-hidden="true" />
                  {en.accounts.addCurrency.replace(
                    "{name}",
                    () => account.name,
                  )}
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      )}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{en.accounts.detail.recent}</h2>
          {days.length === 0 ? null : (
            <Link
              href={`/transactions?account=${account.id}&month=all`}
              className="inline-flex min-h-11 items-center text-base font-medium text-primary"
            >
              {en.accounts.detail.seeAll}
            </Link>
          )}
        </div>
        {days.length === 0 ? (
          <p className="text-base text-muted-foreground">
            {en.accounts.detail.noTransactions}
          </p>
        ) : (
          <HistoryList
            days={days}
            today={todayIn(profile.timeZone)}
            headingLevel={3}
          />
        )}
      </div>
      {account.archived ? null : <ArchiveButton id={account.id} />}
    </div>
  );
}
