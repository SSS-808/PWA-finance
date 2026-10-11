import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { en } from "@/messages/en";
import { BudgetForm, EndButton, getBudgetToEdit } from "@/modules/budgets";
import { money, toDecimalString } from "@/modules/money";

export default function EditBudgetPage({
  searchParams,
}: PageProps<"/budgets/edit">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Link
        href="/budgets"
        className="inline-flex min-h-12 items-center gap-2 text-base text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {en.budgets.back}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.budgets.editTitle}
      </h1>
      <Suspense>
        <EditBudgetContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditBudgetContent({
  searchParams,
}: {
  searchParams: PageProps<"/budgets/edit">["searchParams"];
}) {
  const { category, currency } = await searchParams;
  // The lookup answers 404 for a bad id or currency, or when no budget is in force
  const budget = await getBudgetToEdit(
    typeof category === "string" ? category : "",
    typeof currency === "string" ? currency : "",
  );
  return (
    <div className="space-y-6">
      <BudgetForm
        mode="edit"
        categoryId={budget.categoryId}
        categoryName={budget.categoryName}
        currency={budget.currency}
        amount={toDecimalString(money(budget.amountMinor, budget.currency))}
      />
      <EndButton categoryId={budget.categoryId} currency={budget.currency} />
    </div>
  );
}
