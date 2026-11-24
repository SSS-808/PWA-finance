import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { FormSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import { shortcutEnabled } from "@/lib/features";
import { en } from "@/messages/en";
import { listAccounts } from "@/modules/accounts";
import { MAX_KEYS, NewKeyForm, listShortcutKeys } from "@/modules/shortcut";

const text = en.shortcut.settings;

export default function NewShortcutKeyPage() {
  if (!shortcutEnabled()) notFound();
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/settings/shortcut" label={text.back} />
      <Suspense
        fallback={
          <>
            <LoadingStatus />
            <FormSkeleton title={text.form.title} />
          </>
        }
      >
        <NewKeyContent />
      </Suspense>
    </div>
  );
}

async function NewKeyContent() {
  const [keys, accounts] = await Promise.all([
    listShortcutKeys(),
    listAccounts(),
  ]);
  if (keys.length >= MAX_KEYS) {
    return (
      <>
        <h1 className="text-3xl font-semibold tracking-tight">
          {text.form.title}
        </h1>
        <p className="text-base text-muted-foreground">{text.limitReached}</p>
      </>
    );
  }
  const active = accounts.filter((account) => !account.archived);
  if (active.length === 0) {
    return (
      <>
        <h1 className="text-3xl font-semibold tracking-tight">
          {text.form.title}
        </h1>
        <p className="text-base text-muted-foreground">
          {text.form.noAccounts}
        </p>
        <Button asChild className="h-12 w-full text-base">
          <Link href="/accounts/new">{text.form.addAccount}</Link>
        </Button>
      </>
    );
  }
  return (
    <NewKeyForm
      accounts={active.map(({ id, name, currency }) => ({
        id,
        name,
        currency,
      }))}
    />
  );
}
