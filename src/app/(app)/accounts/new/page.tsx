import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { FormSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { AccountForm, isAccountType, listAccounts } from "@/modules/accounts";
import { CURRENCY_CODES } from "@/modules/money";

export default function NewAccountPage({
  searchParams,
}: PageProps<"/accounts/new">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/accounts" label={en.accounts.detail.back} />
      <Suspense
        fallback={
          <div className="space-y-6">
            <LoadingStatus />
            <FormSkeleton title={en.accounts.form.newTitle} />
          </div>
        }
      >
        <NewAccountForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewAccountForm({
  searchParams,
}: {
  searchParams: PageProps<"/accounts/new">["searchParams"];
}) {
  const { name: nameParam, type: typeParam } = await searchParams;
  const name = typeof nameParam === "string" ? nameParam : "";
  const type =
    typeof typeParam === "string" && isAccountType(typeParam)
      ? typeParam
      : undefined;
  // A name that is filled in starts on the first currency it does not use yet
  const accounts = name ? await listAccounts() : [];
  const used = new Set(
    accounts
      .filter(
        (account) =>
          !account.archived &&
          account.name.toLowerCase() === name.toLowerCase(),
      )
      .map((account) => account.currency),
  );
  const currency =
    CURRENCY_CODES.find((code) => !used.has(code)) ?? CURRENCY_CODES[0];

  return (
    <AccountForm
      mode="create"
      title={en.accounts.form.newTitle}
      name={name}
      type={type}
      currency={currency}
    />
  );
}
