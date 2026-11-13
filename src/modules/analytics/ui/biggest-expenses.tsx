import Link from "next/link";
import { CategoryIcon } from "@/components/shared/category-icon";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import { dayMonth } from "../domain/chart";
import type { CategoryInfo, ExpenseItem } from "../domain/types";

type BiggestItem = ExpenseItem & CategoryInfo & { accountName: string };

// The largest single payments; each row opens its entry
export function BiggestExpenses({ items }: { items: readonly BiggestItem[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/transactions/${item.id}`}
            className="flex min-h-14 items-center gap-3 py-2 hover:bg-muted"
          >
            <CategoryIcon icon={item.icon} color={item.color} />
            <span className="min-w-0 flex-1">
              <span className="block text-base break-words">
                {item.note || item.name || en.dashboard.other}
              </span>
              <span className="block text-sm break-words text-muted-foreground">
                {dayMonth(item.date)} · {item.accountName}
              </span>
            </span>
            <span className="shrink-0 text-right text-base font-semibold tabular-nums">
              {formatMoney(item.amount)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
