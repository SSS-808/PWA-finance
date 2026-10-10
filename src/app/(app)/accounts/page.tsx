import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import {
  AccountList,
  EmptyAccounts,
  Notice,
  listAccounts,
} from "@/modules/accounts";
import { SavedNotice } from "@/modules/transactions";

const toggleClass =
  "inline-flex min-h-12 items-center font-medium underline underline-offset-4";

export default function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {en.accounts.title}
        </h1>
        <Button asChild className="h-12 text-base">
          <Link href="/accounts/new">{en.accounts.add}</Link>
        </Button>
      </div>
      <Suspense>
        <AccountsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AccountsContent({
  searchParams,
}: {
  searchParams: PageProps<"/accounts">["searchParams"];
}) {
  const {
    notice,
    archived: showArchivedParam,
    saved,
    saved_transfer: savedTransfer,
    deleted,
  } = await searchParams;
  const accounts = await listAccounts();
  const active = accounts.filter((account) => !account.archived);
  const archived = accounts.filter((account) => account.archived);
  const showArchived = showArchivedParam === "1";

  return (
    <div className="space-y-8">
      <Notice notice={notice} />
      <SavedNotice
        saved={saved}
        savedTransfer={savedTransfer}
        deleted={deleted}
      />
      {active.length === 0 ? (
        <EmptyAccounts />
      ) : (
        <AccountList accounts={active} />
      )}
      {archived.length > 0 ? (
        <div className="space-y-4">
          <Link
            href={showArchived ? "/accounts" : "/accounts?archived=1"}
            className={toggleClass}
          >
            {showArchived
              ? en.accounts.hideArchived
              : en.accounts.showArchived.replace(
                  "{count}",
                  String(archived.length),
                )}
          </Link>
          {showArchived ? <AccountList accounts={archived} archived /> : null}
        </div>
      ) : null}
    </div>
  );
}
