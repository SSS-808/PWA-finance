import { Suspense } from "react";
import { en } from "@/messages/en";
import { LogoutButton, requireUser } from "@/modules/auth";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-2 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{en.home.title}</h1>
      <Suspense>
        <HomeContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HomeContent({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const user = await requireUser();
  const { notice } = await searchParams;
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
        <p className="text-base">
          {en.home.greeting.replace("{email}", user.email)}
        </p>
        <p className="text-base text-muted-foreground">{en.home.comingSoon}</p>
      </div>
      <LogoutButton />
    </div>
  );
}
