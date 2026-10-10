import Link from "next/link";
import { en } from "@/messages/en";
import type { ManagedCategory } from "../domain/types";
import { ShowButton } from "./show-button";

function CategoryRow({ category }: { category: ManagedCategory }) {
  return (
    <li className="flex min-h-14 items-center justify-between gap-3 rounded-lg px-3 py-2">
      <span className="min-w-0">
        <span className="block text-base font-medium break-words">
          {category.name}
        </span>
        {category.hidden ? (
          <span className="block text-sm text-muted-foreground">
            {en.categories.kinds[category.kind]}
          </span>
        ) : null}
      </span>
      {category.hidden ? (
        <div className="w-36 shrink-0">
          <ShowButton id={category.id} />
        </div>
      ) : (
        <Link
          href={`/settings/categories/${category.id}`}
          className="inline-flex min-h-12 shrink-0 items-center text-base underline underline-offset-4"
        >
          {en.categories.rename}
        </Link>
      )}
    </li>
  );
}

// A titled list of categories; active ones link to Rename, hidden ones have Show again
export function CategoryList({
  id,
  title,
  categories,
}: {
  id: string;
  title: string;
  categories: readonly ManagedCategory[];
}) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {categories.length === 0 ? (
        <p className="px-3 text-base text-muted-foreground">
          {en.categories.empty}
        </p>
      ) : (
        <ul>
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      )}
    </section>
  );
}
