import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { type Money, formatMoney } from "@/modules/money";

function Tile({
  label,
  value,
  className,
  valueClass,
}: {
  label: string;
  value: string;
  className: string;
  valueClass?: string;
}) {
  return (
    <div className={cn("space-y-0.5 rounded-xl p-3", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-base font-semibold break-words tabular-nums",
          valueClass,
        )}
      >
        {value}
      </p>
    </div>
  );
}

// The average full month: money in, money out, what was kept and the savings rate
export function NormalMonthTiles({
  income,
  spending,
  kept,
  savingsRate,
}: {
  income: Money;
  spending: Money;
  kept: Money;
  savingsRate: number | null;
}) {
  const text = en.insights;
  return (
    <div className="grid grid-cols-2 gap-2">
      <Tile
        label={text.moneyIn}
        value={formatMoney(income)}
        className="bg-income-soft"
        valueClass="text-income"
      />
      <Tile
        label={text.moneyOut}
        value={formatMoney(spending)}
        className="bg-expense-soft"
        valueClass="text-expense"
      />
      <Tile
        label={text.kept}
        value={formatMoney(kept)}
        className="bg-net-soft"
        valueClass="text-net"
      />
      <Tile
        label={text.savingsRate}
        value={savingsRate === null ? "–" : `${savingsRate}%`}
        className="bg-muted"
      />
    </div>
  );
}
