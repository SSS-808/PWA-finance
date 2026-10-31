import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { en } from "@/messages/en";
import { BudgetForm, EndButton, getBudgetToEdit } from "@/modules/budgets";
import { money, toDecimalString } from "@/modules/money";

export default function EditBudgetPage({
  searchParams,
}: PageProps<"/budgets/edit">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/budgets" label={en.budgets.back} />
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
        title={en.budgets.editTitle}
        categoryId={budget.categoryId}
        categoryName={budget.categoryName}
        currency={budget.currency}
        amount={toDecimalString(money(budget.amountMinor, budget.currency))}
      />
      <EndButton categoryId={budget.categoryId} currency={budget.currency} />
    </div>
  );
}
