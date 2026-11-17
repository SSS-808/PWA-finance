import Link from "next/link";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { HelpHint } from "@/components/shared/help-hint";
import {
  CardListSkeleton,
  LoadingStatus,
  Skeleton,
} from "@/components/shared/skeleton";
import { ToastOnce } from "@/components/shared/toast-once";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import {
  AddressRow,
  KeyList,
  MAX_KEYS,
  listShortcutKeys,
} from "@/modules/shortcut";

const text = en.shortcut.settings;

export default function ShortcutSettingsPage({
  searchParams,
}: PageProps<"/settings/shortcut">) {
  return (
    <div className="w-full max-w-md space-y-8">
      <BackLink href="/settings" label={text.backToSettings} />
      <div className="flex items-center gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{text.title}</h1>
        <HelpHint label={text.title}>{text.titleHint}</HelpHint>
      </div>
      <Suspense fallback={<Skeleton className="h-12 rounded-full" />}>
        <MakeKeyAction />
      </Suspense>
      <Suspense
        fallback={
          <>
            <LoadingStatus />
            <CardListSkeleton rows={1} />
          </>
        }
      >
        <KeyList />
      </Suspense>
      <section aria-labelledby="shortcut-setup" className="space-y-2">
        <h2
          id="shortcut-setup"
          className="px-1 text-sm font-medium text-muted-foreground"
        >
          {text.setUp}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <AddressRow />
        </div>
      </section>
      <Suspense fallback={null}>
        <DeletedToast searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function MakeKeyAction() {
  const keys = await listShortcutKeys();
  if (keys.length >= MAX_KEYS) {
    return (
      <p className="text-base text-muted-foreground">{text.limitReached}</p>
    );
  }
  return (
    <Button asChild className="h-12 w-full text-base">
      <Link href="/settings/shortcut/new">{text.makeKey}</Link>
    </Button>
  );
}

async function DeletedToast({
  searchParams,
}: {
  searchParams: PageProps<"/settings/shortcut">["searchParams"];
}) {
  const { deleted } = await searchParams;
  if (deleted === undefined) return null;
  return <ToastOnce message={text.deleted} param="deleted" />;
}
