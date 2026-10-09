import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { LogoutButton, requireUser } from "@/modules/auth";
import { ProfileForm, getProfile, timeZoneOptions } from "@/modules/profile";

export default function SettingsPage() {
  return (
    <div className="w-full max-w-md space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.settings.title}
      </h1>
      <section aria-labelledby="settings-profile" className="space-y-4">
        <h2 id="settings-profile" className="text-xl font-semibold">
          {en.settings.profile.title}
        </h2>
        <Suspense>
          <ProfileSection />
        </Suspense>
      </section>
      <section aria-labelledby="settings-account" className="space-y-4">
        <h2 id="settings-account" className="text-xl font-semibold">
          {en.settings.account.title}
        </h2>
        <Suspense>
          <AccountEmail />
        </Suspense>
        <div className="space-y-3">
          <Button asChild variant="outline" className="h-12 w-full text-base">
            <Link href="/reset-password">
              {en.settings.account.changePassword}
            </Link>
          </Button>
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
    <dl className="space-y-1">
      <dt className="text-sm text-muted-foreground">
        {en.settings.account.email}
      </dt>
      <dd className="text-base break-all">{user.email}</dd>
    </dl>
  );
}
