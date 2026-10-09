import Link from "next/link";
import { en } from "@/messages/en";
import { formatMoney, negate } from "@/modules/money";
import type {
  DayGroup,
  EntryItem,
  HistoryItem,
  TransferItem,
} from "../domain/history";

const rowClass =
  "flex min-h-14 items-center justify-between gap-3 rounded-lg px-3 py-2";

function previousDay(date: string): string {
  const [year = 0, month = 0, day = 0] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1))
    .toISOString()
    .slice(0, 10);
}

// A date like "Fri 9 Oct"; the day is a plain calendar date, so it is formatted without any time zone shift
function formatDay(date: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatToParts(new Date(`${date}T00:00:00Z`));
  const part = (type: string) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}

// "today" is already the date in the person's own time zone
function dayLabel(date: string, today: string): string {
  if (date === today) return en.transactions.today;
  if (date === previousDay(today)) return en.transactions.yesterday;
  return formatDay(date);
}

function EntryRow({ item }: { item: EntryItem }) {
  const content = (
    <>
      <span className="min-w-0">
        <span className="block text-base font-medium break-words">
          {item.categoryName ?? en.transactions.kinds[item.kind]}
        </span>
        {item.note ? (
          <span className="block text-sm break-words text-muted-foreground">
            {item.note}
          </span>
        ) : null}
        <span className="block text-sm break-words text-muted-foreground">
          {item.accountName}
        </span>
      </span>
      <span className="shrink-0 text-right text-base tabular-nums">
        {formatMoney(
          item.amount,
          item.kind === "expense" ? {} : { signDisplay: "always" },
        )}
      </span>
    </>
  );
  // Only income and expense can be opened; the others come with their own screens later
  if (item.kind === "income" || item.kind === "expense") {
    return (
      <li>
        <Link
          href={`/transactions/${item.id}`}
          className={`${rowClass} hover:bg-muted`}
        >
          {content}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <div className={rowClass}>{content}</div>
    </li>
  );
}

function TransferRow({ item }: { item: TransferItem }) {
  const { fromAmount, toAmount } = item;
  const exchange =
    fromAmount && toAmount && fromAmount.currency !== toAmount.currency;
  const single = toAmount ?? (fromAmount ? negate(fromAmount) : null);
  return (
    <li>
      <div className={rowClass}>
        <span className="min-w-0">
          <span className="block text-base font-medium break-words">
            {item.from ?? en.transactions.unknownAccount}
            {" → "}
            {item.to ?? en.transactions.unknownAccount}
          </span>
          {item.note ? (
            <span className="block text-sm break-words text-muted-foreground">
              {item.note}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-right text-base tabular-nums">
          {exchange ? (
            <>
              <span className="block">{formatMoney(fromAmount)}</span>
              <span className="block">
                {formatMoney(toAmount, { signDisplay: "always" })}
              </span>
            </>
          ) : single ? (
            formatMoney(single)
          ) : null}
        </span>
      </div>
    </li>
  );
}

function Row({ item }: { item: HistoryItem }) {
  return item.kind === "transfer" ? (
    <TransferRow item={item} />
  ) : (
    <EntryRow item={item} />
  );
}

export function HistoryList({
  days,
  today,
}: {
  days: readonly DayGroup[];
  today: string;
}) {
  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section
          key={day.date}
          aria-labelledby={`history-${day.date}`}
          className="space-y-1"
        >
          <h2
            id={`history-${day.date}`}
            className="text-sm font-medium text-muted-foreground"
          >
            {dayLabel(day.date, today)}
          </h2>
          <ul>
            {day.items.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
