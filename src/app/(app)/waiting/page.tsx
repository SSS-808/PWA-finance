import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { HelpHint } from "@/components/shared/help-hint";
import { LoadingStatus, Skeleton } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { listAccounts } from "@/modules/accounts";
import { requireUser } from "@/modules/auth";
import { listCategories } from "@/modules/categories";
import { WaitingList } from "@/modules/transactions";

export default function WaitingPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/" label={en.nav.home} />
      <div className="flex items-center gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {en.outbox.title}
        </h1>
        <HelpHint label={en.outbox.helpLabel}>{en.outbox.help}</HelpHint>
      </div>
      <Suspense
        fallback={
          <div className="space-y-3">
            <LoadingStatus />
            <Skeleton className="h-12 rounded-full" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        }
      >
        <WaitingContent />
      </Suspense>
    </div>
  );
}

async function WaitingContent() {
  const [user, accounts, expenseCategories, incomeCategories] =
    await Promise.all([
      requireUser(),
      listAccounts(),
      listCategories("expense"),
      listCategories("income"),
    ]);
  return (
    <WaitingList
      userId={user.id}
      accounts={accounts.map(({ id, name, currency }) => ({
        id,
        name,
        currency,
      }))}
      categories={[...expenseCategories, ...incomeCategories].map(
        ({ id, name, icon, color }) => ({ id, name, icon, color }),
      )}
    />
  );
}
