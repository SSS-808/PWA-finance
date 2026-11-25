import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import { RepayForm, getRepayPage, listAccountChoices } from "@/modules/people";
import { getProfile, todayIn } from "@/modules/profile";

export default function RepayPage({
  params,
  searchParams,
}: PageProps<"/people/[id]/repay">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Suspense
        fallback={
          <>
            <LoadingStatus />
            <FormSkeleton fields={3} />
          </>
        }
      >
        <RepayContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RepayContent({
  params,
  searchParams,
}: {
  params: PageProps<"/people/[id]/repay">["params"];
  searchParams: PageProps<"/people/[id]/repay">["searchParams"];
}) {
  const { id } = await params;
  const { jar } = await searchParams;
  if (typeof jar !== "string") notFound();
  const [{ person, jar: found }, accounts, profile] = await Promise.all([
    getRepayPage(id, jar),
    listAccountChoices(),
    getProfile(),
  ]);
  return (
    <RepayForm
      personId={person.id}
      personName={person.name}
      jar={found}
      accounts={accounts}
      today={todayIn(profile.timeZone)}
    />
  );
}
