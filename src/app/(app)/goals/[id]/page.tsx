import { Pencil } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import {
  HeroSkeleton,
  LoadingStatus,
  Skeleton,
} from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { freeToSpend, listAccounts, showsFree } from "@/modules/accounts";
import {
  ArchiveButton,
  ContributionForm,
  ContributionHistory,
  GoalAccountShares,
  GoalIcon,
  GoalNotice,
  GoalPercent,
  GoalProgress,
  GoalShortWarning,
  UnarchiveButton,
  accountShortfall,
  getGoal,
  goalProgress,
  goalShortInAccount,
} from "@/modules/goals";
import { subtract } from "@/modules/money";
import { getProfile, todayIn } from "@/modules/profile";
import { accountLabel } from "@/modules/transactions";

export default function GoalPage({
  params,
  searchParams,
}: PageProps<"/goals/[id]">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/goals" label={en.goals.back} />
      <Suspense
        fallback={
          <div className="space-y-6">
            <LoadingStatus />
            <HeroSkeleton />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        }
      >
        <GoalDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function GoalDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/goals/[id]">["params"];
  searchParams: PageProps<"/goals/[id]">["searchParams"];
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const [goal, profile, accounts] = await Promise.all([
    getGoal(id),
    getProfile(),
    listAccounts(),
  ]);
  const today = todayIn(profile.timeZone);
  const progress = goalProgress(goal, today);
  const currency = goal.target.currency;
  const labels = new Map(
    accounts.map((account) => [account.id, accountLabel(account, accounts)]),
  );
  // The accounts that can take this goal's money: active, in the goal's currency
  const choices = accounts
    .filter((account) => !account.archived && account.currency === currency)
    .map((account) => ({
      id: account.id,
      label: accountLabel(account, accounts),
      free: showsFree(account)
        ? freeToSpend(account.balance, account.minimum, account.setAside)
        : null,
    }));
  // An archived goal frees its money, so it has no shares or warnings to show
  const held = goal.archived
    ? []
    : goal.shares.flatMap((share) => {
        const account = accounts.find((other) => other.id === share.accountId);
        if (!account) return [];
        const shortfall = accountShortfall(
          account.balance,
          account.minimum,
          account.setAside,
        );
        const missing = goalShortInAccount(share.amount, shortfall);
        return [{ account, share: share.amount, missing }];
      });

  return (
    <div className="space-y-6">
      <GoalNotice notice={notice} />
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <GoalIcon reached={progress.reached} />
          <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight break-words">
            {goal.name}
          </h1>
          <GoalPercent percent={progress.percent} reached={progress.reached} />
        </div>
        <GoalProgress goal={goal} today={today} />
        <GoalAccountShares
          shares={held.map(({ account, share }) => ({
            id: account.id,
            label: labels.get(account.id) ?? account.name,
            amount: share,
          }))}
        />
      </div>
      {held.map(({ account, share, missing }) =>
        missing.minor > 0 ? (
          <GoalShortWarning
            key={account.id}
            goalId={goal.id}
            accountId={account.id}
            account={labels.get(account.id) ?? account.name}
            held={subtract(share, missing)}
            aside={share}
            missing={missing}
          />
        ) : null,
      )}
      {goal.archived ? null : (
        <ContributionForm
          goalId={goal.id}
          currency={currency}
          accounts={choices}
          hasUnassigned={goal.shares.some((share) => share.accountId === null)}
        />
      )}
      <ContributionHistory
        contributions={goal.contributions}
        accountLabels={labels}
      />
      <div className="space-y-3">
        <Button
          asChild
          variant="outline"
          className="h-12 w-full rounded-xl bg-card text-base"
        >
          <Link href={`/goals/${goal.id}/edit`}>
            <Pencil className="size-5" aria-hidden="true" />
            {en.goals.edit}
          </Link>
        </Button>
        {goal.archived ? (
          <UnarchiveButton id={goal.id} />
        ) : (
          <ArchiveButton id={goal.id} />
        )}
      </div>
    </div>
  );
}
