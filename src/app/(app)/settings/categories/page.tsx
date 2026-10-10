import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { en } from "@/messages/en";
import {
  CategoryForm,
  CategoryList,
  CategoryNotice,
  listAllCategories,
} from "@/modules/categories";

const toggleClass =
  "inline-flex min-h-12 items-center font-medium underline underline-offset-4";

export default function CategoriesPage({
  searchParams,
}: PageProps<"/settings/categories">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Link
        href="/settings"
        className="inline-flex min-h-12 items-center gap-2 text-base text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {en.categories.backToSettings}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.categories.title}
      </h1>
      <Suspense>
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
      <section aria-labelledby="categories-add" className="space-y-4">
        <h2 id="categories-add" className="text-xl font-semibold">
          {en.categories.addTitle}
        </h2>
        <CategoryForm mode="create" />
      </section>
      <CategoryList
        id="categories-expense"
        title={en.categories.expenseTitle}
        categories={active.filter((category) => category.kind === "expense")}
      />
      <CategoryList
        id="categories-income"
        title={en.categories.incomeTitle}
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
