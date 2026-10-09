import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { listAccounts } from "@/modules/accounts";
import { getProfile } from "@/modules/profile";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{en.home.title}</h1>
      <Suspense>
        <HomeContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function HomeContent({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const [profile, accounts] = await Promise.all([getProfile(), listAccounts()]);
  const { notice } = await searchParams;
  const hasActiveAccounts = accounts.some((account) => !account.archived);
  const greeting = profile.displayName
    ? en.home.greetingNamed.replace("{name}", profile.displayName)
    : en.home.greeting.replace("{email}", profile.email);
  return (
    <div className="space-y-6">
      {notice === "password-updated" ? (
        <p
          role="status"
          className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
        >
          {en.home.passwordUpdated}
        </p>
      ) : null}
      <div className="space-y-2">
        <p className="text-base break-words">{greeting}</p>
        <p className="text-base text-muted-foreground">{en.home.comingSoon}</p>
      </div>
      {hasActiveAccounts ? null : (
        <div className="space-y-4 rounded-lg border border-border px-4 py-6">
          <h2 className="text-xl font-semibold">{en.home.startTitle}</h2>
          <p className="text-base text-muted-foreground">{en.home.startBody}</p>
          <Button asChild className="h-12 w-full text-base">
            <Link href="/accounts/new">{en.accounts.addFirst}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
