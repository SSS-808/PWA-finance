import { Suspense } from "react";
import { en } from "@/messages/en";
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
  const profile = await getProfile();
  const { notice } = await searchParams;
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
    </div>
  );
}
