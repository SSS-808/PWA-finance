import { Pencil, Scale } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import {
  AccountTypeIcon,
  ArchiveButton,
  Notice,
  UnarchiveButton,
  balanceText,
  getAccount,
} from "@/modules/accounts";
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
      <Suspense>
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
  const [profile, days] = await Promise.all([
    getProfile(),
    listTransactions(
      { ...baseFilters(null), accountId: account.id },
      RECENT_COUNT,
    ),
  ]);

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
          <HistoryList days={days} today={todayIn(profile.timeZone)} />
        )}
      </div>
      {account.archived ? null : <ArchiveButton id={account.id} />}
    </div>
  );
}
