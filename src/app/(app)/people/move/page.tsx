import { Suspense } from "react";
import { FormSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import {
  type MoveKind,
  MoveForm,
  listAccountChoices,
  listPeople,
} from "@/modules/people";
import { getProfile, todayIn } from "@/modules/profile";

export default function MovePage({ searchParams }: PageProps<"/people/move">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Suspense
        fallback={
          <>
            <LoadingStatus />
            <FormSkeleton fields={5} />
          </>
        }
      >
        <MoveContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function MoveContent({
  searchParams,
}: {
  searchParams: PageProps<"/people/move">["searchParams"];
}) {
  const { kind, person } = await searchParams;
  const [people, accounts, profile] = await Promise.all([
    listPeople(),
    listAccountChoices(),
    getProfile(),
  ]);
  const startKind: MoveKind = kind === "borrow" ? "borrow" : "lend";
  return (
    <MoveForm
      accounts={accounts}
      people={people.map(({ id, name }) => ({ id, name }))}
      kind={startKind}
      personId={typeof person === "string" ? person : undefined}
      today={todayIn(profile.timeZone)}
    />
  );
}
