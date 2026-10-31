import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
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
      <BackLink href="/settings/categories" label={en.categories.backToList} />
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
      <p className="flex items-center gap-2 text-base text-muted-foreground">
        {en.categories.kinds[category.kind]}
        {category.hidden ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-sm text-foreground">
            {en.categories.hiddenTitle}
          </span>
        ) : null}
      </p>
      <CategoryForm
        mode="edit"
        id={category.id}
        name={category.name}
        icon={category.icon}
        color={category.color}
      />
      {category.hidden ? (
        <ShowButton id={category.id} />
      ) : (
        <HideButton id={category.id} />
      )}
    </div>
  );
}
