import {
  CategoryIcon,
  categoryBarClass,
} from "@/components/shared/category-icon";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import type { UsualCategory } from "../domain/types";

// Each category's average per month, with a small bar for every month
export function UsualCategories({
  items,
}: {
  items: readonly UsualCategory[];
}) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        // Bar heights are a display ratio only
        const largest = Math.max(
          1,
          ...item.byMonth.map((value) => value.minor),
        );
        return (
          <li
            key={item.categoryId ?? "other"}
            className="flex min-h-14 items-center gap-3 py-2"
          >
            <CategoryIcon icon={item.icon} color={item.color} />
            <span className="min-w-0 flex-1">
              <span className="block text-base break-words">
                {item.categoryId === null ? en.insights.rest : item.name}
              </span>
              <span className="block text-sm text-muted-foreground tabular-nums">
                {en.insights.perMonth.replace(
                  "{amount}",
                  formatMoney(item.average),
                )}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="flex h-6 shrink-0 items-end gap-0.5"
            >
              {item.byMonth.map((value, position) => (
                <span
                  key={position}
                  className={cn(
                    "block w-1.5 rounded-t-sm",
                    categoryBarClass(item.color),
                    position < item.byMonth.length - 1 && "opacity-35",
                  )}
                  style={{ height: `${(value.minor / largest) * 24}px` }}
                />
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
