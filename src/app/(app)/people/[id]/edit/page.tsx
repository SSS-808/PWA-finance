import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { FormSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import {
  ArchivePersonButton,
  EditPersonForm,
  getPerson,
  openJars,
} from "@/modules/people";

export default function EditPersonPage({
  params,
}: PageProps<"/people/[id]/edit">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Suspense
        fallback={
          <>
            <BackLink href="/people" label={en.people.back} />
            <LoadingStatus />
            <FormSkeleton fields={2} />
          </>
        }
      >
        <EditPersonContent params={params} />
      </Suspense>
    </div>
  );
}

async function EditPersonContent({
  params,
}: {
  params: PageProps<"/people/[id]/edit">["params"];
}) {
  const { id } = await params;
  const person = await getPerson(id);
  const open = openJars(person);
  return (
    <div className="space-y-6">
      <BackLink href={`/people/${person.id}`} label={person.name} />
      <EditPersonForm id={person.id} name={person.name} jars={open} />
      {open.length === 0 ? (
        <ArchivePersonButton id={person.id} name={person.name} />
      ) : null}
    </div>
  );
}
