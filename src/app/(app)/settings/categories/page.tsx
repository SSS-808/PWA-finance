import Link from "next/link";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { HelpHint } from "@/components/shared/help-hint";
import { CardListSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import {
  CategoryForm,
  CategoryList,
  CategoryNotice,
  SortableCategoryList,
  listAllCategories,
} from "@/modules/categories";

const toggleClass =
  "flex min-h-11 items-center justify-center text-base font-medium text-muted-foreground underline underline-offset-4";

export default function CategoriesPage({
  searchParams,
}: PageProps<"/settings/categories">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/settings" label={en.categories.backToSettings} />
      <div className="flex items-center gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {en.categories.title}
        </h1>
        <HelpHint label={en.categories.title}>
          {en.categories.order.help}
        </HelpHint>
      </div>
      <Suspense
        fallback={
          <>
            <LoadingStatus />
            <CardListSkeleton rows={5} />
          </>
        }
      >
        <CategoriesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CategoriesContent({
  searchParams,
}: {
  searchParams: PageProps<"/settings/categories">["searchParams"];
}) {
  const { notice, hidden: showHiddenParam } = await searchParams;
  const categories = await listAllCategories();
  const active = categories.filter((category) => !category.hidden);
  const hidden = categories.filter((category) => category.hidden);
  const showHidden = showHiddenParam === "1";

  return (
    <div className="space-y-8">
      <CategoryNotice notice={notice} />
      <section aria-labelledby="categories-add" className="space-y-2">
        <h2
          id="categories-add"
          className="px-1 text-sm font-medium text-muted-foreground"
        >
          {en.categories.addTitle}
        </h2>
        <div className="rounded-2xl border border-border bg-card p-5">
          <CategoryForm mode="create" />
        </div>
      </section>
      <SortableCategoryList
        id="categories-expense"
        title={en.categories.expenseTitle}
        kind="expense"
        categories={active.filter((category) => category.kind === "expense")}
      />
      <SortableCategoryList
        id="categories-income"
        title={en.categories.incomeTitle}
        kind="income"
        categories={active.filter((category) => category.kind === "income")}
      />
      {hidden.length > 0 ? (
        <div className="space-y-4">
          <Link
            href={
              showHidden
                ? "/settings/categories"
                : "/settings/categories?hidden=1"
            }
            className={toggleClass}
          >
            {showHidden
              ? en.categories.hideHidden
              : en.categories.showHidden.replace(
                  "{count}",
                  String(hidden.length),
                )}
          </Link>
          {showHidden ? (
            <CategoryList
              id="categories-hidden"
              title={en.categories.hiddenTitle}
              categories={hidden}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
