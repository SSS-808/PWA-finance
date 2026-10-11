import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { BudgetForm } from "@/modules/budgets";
import { listCategories } from "@/modules/categories";
import { CURRENCY_CODES, isCurrencyCode } from "@/modules/money";
import { getProfile } from "@/modules/profile";

export default function NewBudgetPage() {
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
        {en.budgets.newTitle}
      </h1>
      <Suspense>
        <NewBudgetContent />
      </Suspense>
    </div>
  );
}

async function NewBudgetContent() {
  const [categories, profile] = await Promise.all([
    listCategories("expense"),
    getProfile(),
  ]);
  if (categories.length === 0) {
    return (
      <div className="space-y-4 rounded-lg border border-border px-4 py-6">
        <p className="text-base">{en.budgets.noCategories}</p>
        <Button asChild className="h-12 w-full text-base">
          <Link href="/settings/categories">{en.categories.title}</Link>
        </Button>
      </div>
    );
  }
  return (
    <BudgetForm
      mode="create"
      categories={categories.map(({ id, name }) => ({ id, name }))}
      defaultCurrency={
        isCurrencyCode(profile.baseCurrency)
          ? profile.baseCurrency
          : CURRENCY_CODES[0]
      }
    />
  );
}
