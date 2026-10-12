"use client";

import { useState } from "react";
import type { UseFormRegister } from "react-hook-form";
import { CategoryIcon } from "@/components/shared/category-icon";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import type { EntryInput } from "../domain/schemas";
import type { CategoryOption } from "../domain/types";

const PER_PAGE = 4;

// One swipeable row of four category badges, or the full grid after Show all
export function CategoryPicker({
  categories,
  initialId,
  selectedId,
  register,
  labelId,
  errorId,
}: {
  categories: readonly CategoryOption[];
  initialId: string;
  selectedId: string;
  register: UseFormRegister<EntryInput>;
  labelId: string;
  errorId?: string;
}) {
  // A saved category beyond the first four would be hidden in the row, so start open
  const [expanded, setExpanded] = useState(
    categories.findIndex((category) => category.id === initialId) >= PER_PAGE,
  );
  const [page, setPage] = useState(0);
  const pages = Math.ceil(categories.length / PER_PAGE);

  // The last page can be shorter than the row, so the dots follow how far the row has scrolled
  function followScroll(row: HTMLDivElement) {
    const furthest = row.scrollWidth - row.clientWidth;
    setPage(
      furthest > 0 ? Math.round((row.scrollLeft / furthest) * (pages - 1)) : 0,
    );
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      aria-describedby={errorId}
      className="space-y-2"
    >
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span id={labelId} className="text-base font-medium">
          {en.transactions.form.category}
        </span>
        {categories.length > PER_PAGE ? (
          <button
            type="button"
            aria-expanded={expanded}
            className="min-h-11 rounded-lg px-1 text-base font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => {
              setExpanded(!expanded);
              setPage(0);
            }}
          >
            {expanded
              ? en.transactions.form.showLess
              : en.transactions.form.showAll}
          </button>
        ) : null}
      </div>
      <div
        className={
          expanded
            ? "grid grid-cols-4 gap-1"
            : "flex snap-x snap-mandatory [scrollbar-width:none] gap-1 overflow-x-auto"
        }
        onScroll={
          expanded ? undefined : (event) => followScroll(event.currentTarget)
        }
      >
        {categories.map((category) => (
          <label
            key={category.id}
            className={cn(
              "relative min-w-0",
              !expanded && "shrink-0 basis-[calc(25%-0.1875rem)] snap-start",
            )}
          >
            <input
              type="radio"
              value={category.id}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0"
              defaultChecked={category.id === initialId}
              {...register("categoryId")}
            />
            <span className="flex flex-col items-center gap-1.5 rounded-2xl px-0.5 py-2 text-xs text-muted-foreground peer-checked:bg-muted peer-checked:font-semibold peer-checked:text-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
              <CategoryIcon
                icon={category.icon}
                color={category.color}
                size="lg"
                solid={category.id === selectedId}
              />
              <span className="line-clamp-2 w-full text-center break-words hyphens-auto">
                {category.name}
              </span>
            </span>
          </label>
        ))}
      </div>
      {!expanded && pages > 1 ? (
        <div aria-hidden="true" className="flex justify-center gap-1.5">
          {Array.from({ length: pages }, (_, index) => (
            <span
              key={index}
              className={cn(
                "size-1.5 rounded-full",
                index === page ? "bg-foreground" : "bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
