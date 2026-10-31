import { ChevronRight, Download, KeyRound, Tags } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import {
  FormSkeleton,
  LoadingStatus,
  Skeleton,
} from "@/components/shared/skeleton";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { LogoutButton, requireUser } from "@/modules/auth";
import { ProfileForm, getProfile, timeZoneOptions } from "@/modules/profile";

const cardClass = "overflow-hidden rounded-2xl border border-border bg-card";

const headingClass = "px-1 text-sm font-medium text-muted-foreground";

const rowClass = "flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted";

// The inside of a link row: an icon in a grey circle, the label and a chevron
function SettingsRow({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 text-base font-medium">{label}</span>
      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="w-full max-w-md space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.settings.title}
      </h1>
      <section aria-labelledby="settings-profile" className="space-y-2">
        <h2 id="settings-profile" className={headingClass}>
          {en.settings.profile.title}
        </h2>
        <div className={cn(cardClass, "p-5")}>
          <Suspense
            fallback={
              <>
                <LoadingStatus />
                <FormSkeleton fields={3} />
              </>
            }
          >
            <ProfileSection />
          </Suspense>
        </div>
      </section>
      <section aria-labelledby="settings-categories" className="space-y-2">
        <h2 id="settings-categories" className={headingClass}>
          {en.settings.categories.title}
        </h2>
        <div className={cardClass}>
          <Link href="/settings/categories" className={rowClass}>
            <SettingsRow icon={Tags} label={en.settings.categories.manage} />
          </Link>
        </div>
      </section>
      <section aria-labelledby="settings-data" className="space-y-2">
        <h2 id="settings-data" className={headingClass}>
          {en.settings.data.title}
        </h2>
        <div className={cardClass}>
          <a href="/settings/export" download className={rowClass}>
            <SettingsRow icon={Download} label={en.settings.data.download} />
          </a>
        </div>
      </section>
      <section aria-labelledby="settings-account" className="space-y-2">
        <h2 id="settings-account" className={headingClass}>
          {en.settings.account.title}
        </h2>
        <div className={cn(cardClass, "divide-y divide-border")}>
          <Suspense
            fallback={
              <div className="px-4 py-3">
                <LoadingStatus />
                <Skeleton className="h-10 w-48" />
              </div>
            }
          >
            <AccountEmail />
          </Suspense>
          <Link href="/reset-password" className={rowClass}>
            <SettingsRow
              icon={KeyRound}
              label={en.settings.account.changePassword}
            />
          </Link>
          <LogoutButton />
        </div>
      </section>
    </div>
  );
}

async function ProfileSection() {
  const profile = await getProfile();
  return (
    <ProfileForm
      displayName={profile.displayName}
      baseCurrency={profile.baseCurrency}
      timeZone={profile.timeZone}
      timeZones={timeZoneOptions(profile.timeZone)}
    />
  );
}

async function AccountEmail() {
  const user = await requireUser();
  return (
    <dl className="space-y-1 px-4 py-3">
      <dt className="text-sm text-muted-foreground">
        {en.settings.account.email}
      </dt>
      <dd className="text-base break-all">{user.email}</dd>
    </dl>
  );
}
