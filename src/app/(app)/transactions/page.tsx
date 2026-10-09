import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { getProfile, todayIn } from "@/modules/profile";
import {
  HistoryList,
  SavedNotice,
  listRecentTransactions,
} from "@/modules/transactions";

export default function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.transactions.title}
      </h1>
      <Suspense>
        <HistoryContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function HistoryContent({
  searchParams,
}: {
  searchParams: PageProps<"/transactions">["searchParams"];
}) {
  const { saved, deleted } = await searchParams;
  const [profile, days] = await Promise.all([
    getProfile(),
    listRecentTransactions(),
  ]);

  return (
    <div className="space-y-6">
      <SavedNotice saved={saved} deleted={deleted} />
      {days.length === 0 ? (
        <div className="space-y-4 rounded-lg border border-border px-4 py-6">
          <h2 className="text-xl font-semibold">{en.transactions.empty}</h2>
          <Button asChild className="h-12 w-full text-base">
            <Link href="/transactions/new?from=%2Ftransactions">
              {en.transactions.addOne}
            </Link>
          </Button>
        </div>
      ) : (
        <HistoryList days={days} today={todayIn(profile.timeZone)} />
      )}
    </div>
  );
}
