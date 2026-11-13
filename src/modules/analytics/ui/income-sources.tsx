import {
  CategoryIcon,
  categoryBarClass,
} from "@/components/shared/category-icon";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import type { CategoryShare } from "../domain/types";

// Where money in came from, with each source's share
export function IncomeSources({ items }: { items: readonly CategoryShare[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const name = item.categoryId === null ? en.insights.rest : item.name;
        return (
          <li
            key={item.categoryId ?? "other"}
            className="flex min-h-14 items-center gap-3 py-2"
          >
            <CategoryIcon icon={item.icon} color={item.color} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-base break-words">
                  {name} · {Math.round(item.share * 100)}%
                </span>
                <span className="shrink-0 text-right text-base tabular-nums">
                  {formatMoney(item.amount)}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className={cn(
                    "block h-full rounded-full",
                    categoryBarClass(item.color),
                  )}
                  style={{ width: `${item.share * 100}%` }}
                />
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
