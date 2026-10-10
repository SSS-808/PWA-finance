import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { en } from "@/messages/en";
import {
  CategoryForm,
  HideButton,
  ShowButton,
  getCategory,
} from "@/modules/categories";

export default function CategoryPage({
  params,
}: PageProps<"/settings/categories/[id]">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Link
        href="/settings/categories"
        className="inline-flex min-h-12 items-center gap-2 text-base text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {en.categories.backToList}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.categories.detail.title}
      </h1>
      <Suspense>
        <CategoryDetail params={params} />
      </Suspense>
    </div>
  );
}

async function CategoryDetail({
  params,
}: {
  params: PageProps<"/settings/categories/[id]">["params"];
}) {
  const { id } = await params;
  const category = await getCategory(id);

  return (
    <div className="space-y-6">
      <p className="text-base text-muted-foreground">
        {en.categories.kinds[category.kind]}
      </p>
      {category.hidden ? (
        <p className="text-base">{en.categories.detail.hiddenNote}</p>
      ) : null}
      <CategoryForm mode="rename" id={category.id} name={category.name} />
      {category.hidden ? (
        <ShowButton id={category.id} />
      ) : (
        <HideButton id={category.id} />
      )}
    </div>
  );
}
