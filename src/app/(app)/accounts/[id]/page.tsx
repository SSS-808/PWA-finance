import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import {
  ArchiveButton,
  Notice,
  UnarchiveButton,
  displayBalance,
  getAccount,
} from "@/modules/accounts";
import { formatMoney } from "@/modules/money";
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
      <Link
        href="/accounts"
        className="inline-flex min-h-12 items-center gap-2 text-base text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {en.accounts.detail.back}
      </Link>
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
  const { amount, owed } = displayBalance(account.type, account.balance);

  return (
    <div className="space-y-6">
      <Notice notice={notice} />
      <SavedNotice
        saved={saved}
        savedTransfer={savedTransfer}
        deleted={deleted}
      />
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight break-words">
          {account.name}
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 text-base text-muted-foreground">
          <span>{en.accounts.types[account.type]}</span>
          <span aria-hidden="true">·</span>
          <span>{en.currencies[account.currency]}</span>
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {en.accounts.detail.balance}
        </p>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {formatMoney(amount)}
          {owed ? (
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              {en.accounts.owed}
            </span>
          ) : null}
        </p>
      </div>
      <div className="space-y-3">
        <Button asChild variant="outline" className="h-12 w-full text-base">
          <Link href={`/accounts/${account.id}/edit`}>
            {en.accounts.detail.edit}
          </Link>
        </Button>
        {account.archived ? null : (
          <Button asChild variant="outline" className="h-12 w-full text-base">
            <Link href={`/accounts/${account.id}/fix-balance`}>
              {en.accounts.fix.title}
            </Link>
          </Button>
        )}
        {account.archived ? (
          <UnarchiveButton id={account.id} />
        ) : (
          <ArchiveButton id={account.id} />
        )}
      </div>
      {days.length === 0 ? (
        <p className="text-base text-muted-foreground">
          {en.accounts.detail.noTransactions}
        </p>
      ) : (
        <div className="space-y-3">
          <HistoryList days={days} today={todayIn(profile.timeZone)} />
          <Link
            href={`/transactions?account=${account.id}&month=all`}
            className="inline-flex min-h-12 items-center text-base underline underline-offset-4"
          >
            {en.accounts.detail.seeAll}
          </Link>
        </div>
      )}
    </div>
  );
}
